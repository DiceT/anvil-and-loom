#!/usr/bin/env python3
"""
Standalone Anvil & Loom JSON Explorer Server
Simple HTTP server with built-in API endpoints - no Flask required
"""

import http.server
import socketserver
import json
import urllib.parse
import urllib.request
import urllib.error
import base64
import os
from pathlib import Path

# Configuration
PORT = 5000
HOST = 'localhost'

class AnvilLoomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.serve_index_html()
        else:
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/api/chat':
            self.handle_chat_api()
        elif self.path == '/api/batch-generate':
            self.handle_batch_generate_api()
        elif self.path == '/api/openai':
            self.handle_openai_api()
        else:
            self.send_error(404, "API endpoint not found")
    
    def do_OPTIONS(self):
        # Handle CORS preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-API-Key-Encoded')
        self.end_headers()
    
    def serve_index_html(self):
        try:
            with open('index.html', 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(content.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "index.html not found")
    
    def handle_chat_api(self):
        # Add CORS headers
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            # Get API key from headers
            api_key = self.headers.get('X-API-Key')
            if not api_key:
                self.wfile.write(json.dumps({
                    'error': 'API key required. Set X-API-Key header.'
                }).encode('utf-8'))
                return
            
            # Prepare OpenAI API request
            openai_url = 'https://api.openai.com/v1/chat/completions'
            
            # Forward the request to OpenAI
            openai_request = urllib.request.Request(
                openai_url,
                data=json.dumps(request_data).encode('utf-8'),
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                }
            )
            
            with urllib.request.urlopen(openai_request) as response:
                response_data = response.read()
                self.wfile.write(response_data)
                
        except Exception as e:
            error_response = {
                'error': f'API request failed: {str(e)}'
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def handle_batch_generate_api(self):
        # Add CORS headers
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-API-Key-Encoded')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Handle both encoded and regular API keys
            encoded_key = self.headers.get('X-API-Key-Encoded')
            regular_key = self.headers.get('X-API-Key')
            
            if encoded_key:
                api_key = base64.b64decode(encoded_key).decode('utf-8')
            elif regular_key:
                api_key = regular_key
            else:
                self.wfile.write(json.dumps({
                    'error': 'API key required'
                }).encode('utf-8'))
                return

            table_type = data.get('table_type')
            table_name = data.get('table_name')
            model = data.get('model', 'gpt-3.5-turbo')
            domain_context = data.get('domain_context')
            num_entries = data.get('num_entries', 10)
            genre = data.get('genre', 'dark-fantasy')

            # Build context for batch generation
            context_name = domain_context.get('name', 'Unknown') if domain_context else 'Unknown'
            context_type = domain_context.get('type', 'concept') if domain_context else 'concept'
            context_description = domain_context.get('description', '') if domain_context else ''
            
            # Genre-specific styles
            genre_styles = {
                'dark-fantasy': {
                    'tone': 'Grim, morally complex, visceral',
                    'inspiration': 'Joe Abercrombie style - harsh realism, flawed characters, bitter consequences'
                },
                'fantasy': {
                    'tone': 'Epic, heroic, wonder-filled',
                    'inspiration': 'Margaret Weis & Tracy Hickman style - grand quests, noble heroes, magical wonder'
                },
                'sci-fi': {
                    'tone': 'Technological, political, realistic', 
                    'inspiration': 'James S.A. Corey style - hard science, political intrigue, human struggle'
                },
                'starforged': {
                    'tone': 'Swashbuckling, maritime adventure, mystical',
                    'inspiration': 'R.A. Salvatore style - heroic adventure, nautical themes, ancient mysteries'
                }
            }
            
            current_genre = genre_styles.get(genre, genre_styles['dark-fantasy'])

            # Table type rules with contextual generation
            table_rules = {
                'objective': {
                    'word_count': '6-10 words',
                    'focus': 'Thematic obstacles, challenges, puzzles, goals, or tasks that need to be accomplished',
                    'style': 'Clear objectives that players must overcome or achieve to succeed or prevent negative outcomes'
                },
                'atmosphere': {
                    'word_count': '4-10 words', 
                    'focus': 'Sensory experiences, emotional feelings, or intuitive impressions that set the mood',
                    'style': 'Evocative phrases capturing any sense (sight, sound, smell, touch, taste) or emotional/intuitive feelings'
                },
                'manifestation': {
                    'word_count': '4-10 words',
                    'focus': 'Tangible expressions of abstract themes that players can interact with',
                    'style': 'Physical, observable phenomena that bring thematic elements to life'
                },
                'location': {
                    'word_count': '4-10 words',
                    'focus': 'Context-appropriate locations: For buildings/structures, generate ROOMS (throne room, dungeon cell, armory). For natural/exploration domains, generate AREAS or FEATURES (hidden grove, ancient cairn, frozen lake). Consider what explorers would encounter.',
                    'style': 'Buildings: interior rooms and chambers. Wilderness: geographical features, landmarks, and exploration sites. Settlements: districts, buildings, gathering places.'
                },
                'discovery': {
                    'word_count': '4-10 words',
                    'focus': 'Context-specific discoveries fitting the domain/aspect: Ancient places yield historical artifacts, forgotten knowledge, relics. Natural areas contain rare materials, hidden paths, wildlife signs. Structures hold secret passages, hidden chambers, forgotten items. Mystical domains reveal magical phenomena, enchanted objects. Match discoveries to what would realistically be found in this specific environment.',
                    'style': 'Treasures, secrets, lore, clues, artifacts, or phenomena that reward exploration and deepen understanding of this particular place or theme'
                },
                'bane': {
                    'word_count': '4-10 words',
                    'focus': 'Negative influences or obstacles that create challenges',
                    'style': 'Threatening elements that add tension and conflict to scenes'
                },
                'boon': {
                    'word_count': '4-10 words',
                    'focus': 'Positive influences or advantages that aid characters',
                    'style': 'Beneficial elements that provide assistance or opportunities'
                }
            }
            
            current_rules = table_rules.get(table_type, table_rules['atmosphere'])
            
            # Build context information
            context_info = f"""
🎯 PRIMARY THEME: This is the {context_type.upper()} '{context_name}' - the CORE CONCEPT that defines everything.
DESCRIPTION: {context_description}

CRITICAL: Every single piece of content must directly derive from and embody the essence of '{context_name}'. This {context_type} is the foundational theme that gives meaning to all elements.

The {context_type} name '{context_name}' is not just flavor text - it is the generative source of all content."""

            # Create system prompt
            system_prompt = f"""You are a creative writing assistant specializing in tabletop RPG content generation. You create evocative, thematic content for ForgeTable random tables.

WRITING REQUIREMENTS:
- Target 9th grade reading level while maintaining creativity and style
- Write in {current_genre['tone']} style
- Inspired by {current_genre['inspiration']}
- Each entry should be {current_rules['word_count']} words
- Focus: {current_rules['focus']}
- Style: {current_rules['style']}

{context_info}

ANTI-REPETITION RULES:
- Never repeat the same opening words across entries
- Vary sentence structure and phrasing dramatically
- Avoid formulaic patterns or templates
- Each entry must feel unique and distinct

Generate EXACTLY {num_entries} creative entries that embody the essence of '{context_name}'. 

CRITICAL: Return ONLY a valid JSON array of strings, nothing else. No explanations, no markdown, no additional text - just the JSON array.

Example format: ["Entry 1", "Entry 2", "Entry 3"]"""

            # Create OpenAI request with model-specific parameters
            openai_request = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate {num_entries} {table_type} entries for the {context_type} '{context_name}'."}
                ]
            }
            
            # Add model-specific parameters
            if model == "gpt-5":
                # GPT-5 uses max_completion_tokens, reasoning_effort, and default temperature (1)
                # Give more tokens and minimal reasoning to ensure actual content generation
                openai_request["max_completion_tokens"] = 3000
                openai_request["reasoning_effort"] = "minimal"
                # Temperature defaults to 1 for GPT-5, don't set it
            else:
                # All other models use max_tokens and can set temperature
                openai_request["max_tokens"] = 2000
                openai_request["temperature"] = 0.9

            # Call OpenAI API
            openai_url = 'https://api.openai.com/v1/chat/completions'
            
            print(f"\n=== OpenAI API Request ===")
            print(f"Model: {model}")
            print(f"Table Type: {table_type}")
            print(f"Num Entries: {num_entries}")
            print(f"Context: {context_name} ({context_type})")
            print(f"Request payload:")
            print(json.dumps(openai_request, indent=2))
            
            openai_req = urllib.request.Request(
                openai_url,
                data=json.dumps(openai_request).encode('utf-8'),
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                }
            )
            
            with urllib.request.urlopen(openai_req) as response:
                response_data = json.loads(response.read().decode('utf-8'))
                
                # Debug: log the response structure
                print(f"OpenAI API Response: {json.dumps(response_data, indent=2)}")
                
                if 'error' in response_data:
                    error_details = response_data['error']
                    error_msg = f"OpenAI API error {response.status}: {error_details.get('message', 'Unknown error')}"
                    print(f"API Error: {error_msg}")
                    self.wfile.write(json.dumps({
                        'error': error_msg,
                        'details': error_details
                    }).encode('utf-8'))
                    return
                
                if 'choices' in response_data and len(response_data['choices']) > 0:
                    choice = response_data['choices'][0]
                    content = choice['message']['content'].strip()
                    finish_reason = choice.get('finish_reason', 'unknown')
                    
                    print(f"Raw AI Generated Content: '{content}'")
                    print(f"Finish reason: {finish_reason}")
                    
                    # Check if we got an empty response due to token limits
                    if not content and finish_reason == 'length':
                        print("GPT-5 used all tokens for reasoning, no content generated")
                        self.wfile.write(json.dumps({
                            'error': 'GPT-5 used all tokens for reasoning. Try reducing reasoning_effort or increasing max_completion_tokens.',
                            'details': {'finish_reason': finish_reason, 'usage': response_data.get('usage', {})}
                        }).encode('utf-8'))
                        return
                    
                    # Clean up the content for JSON parsing
                    cleaned_content = content
                    if cleaned_content.startswith('```json'):
                        cleaned_content = cleaned_content[7:]
                    if cleaned_content.startswith('```'):
                        cleaned_content = cleaned_content[3:]
                    if cleaned_content.endswith('```'):
                        cleaned_content = cleaned_content[:-3]
                    cleaned_content = cleaned_content.strip()
                    print(f"Cleaned Content: '{cleaned_content}'")
                    
                    try:
                        # Parse JSON response using cleaned content
                        results = json.loads(cleaned_content)
                        if isinstance(results, list):
                            # Truncate to requested number if AI returned more
                            results = results[:num_entries]
                            print(f"Successfully parsed {len(results)} results")
                            self.wfile.write(json.dumps({'results': results}).encode('utf-8'))
                        else:
                            raise ValueError("Expected array response")
                    except (json.JSONDecodeError, ValueError) as e:
                        print(f"JSON parse failed: {e}")
                        print(f"Failed content: {cleaned_content}")
                        
                        # Try to extract JSON array from the response
                        import re
                        json_match = re.search(r'\[.*?\]', cleaned_content, re.DOTALL)
                        if json_match:
                            try:
                                extracted_json = json_match.group(0)
                                print(f"Extracted JSON: {extracted_json}")
                                results = json.loads(extracted_json)
                                if isinstance(results, list):
                                    results = results[:num_entries]
                                    print(f"Successfully parsed extracted JSON with {len(results)} results")
                                    self.wfile.write(json.dumps({'results': results}).encode('utf-8'))
                                    return
                            except json.JSONDecodeError:
                                print("Extracted JSON also failed to parse")
                        
                        # Final fallback: split by lines and clean up
                        lines = [line.strip().strip('"-,') for line in cleaned_content.split('\n') if line.strip()]
                        results = [line for line in lines if line and not line.startswith('[') and not line.startswith(']') and not line.startswith('{')][:num_entries]
                        print(f"Fallback parsing yielded {len(results)} results: {results}")
                        if results:
                            self.wfile.write(json.dumps({'results': results}).encode('utf-8'))
                        else:
                            self.wfile.write(json.dumps({'error': f'Could not parse AI response: {cleaned_content[:500]}...'}).encode('utf-8'))
                else:
                    print(f"No choices in response: {response_data}")
                    self.wfile.write(json.dumps({'error': 'No response from OpenAI'}).encode('utf-8'))
                    
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else 'No error details'
            try:
                error_json = json.loads(error_body)
                error_response = {
                    'error': f'OpenAI API error: {e.code}',
                    'details': error_json
                }
                print(f"OpenAI API error {e.code}: {error_json}")
            except json.JSONDecodeError:
                error_response = {
                    'error': f'OpenAI API error: {e.code}',
                    'details': {'message': error_body}
                }
                print(f"OpenAI API error {e.code}: {error_body}")
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
        except Exception as e:
            error_response = {
                'error': f'Batch generation failed: {str(e)}'
            }
            print(f"Batch generation error: {str(e)}")
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def handle_openai_api(self):
        # Add CORS headers  
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            # Get API key from headers
            api_key = self.headers.get('X-API-Key')
            if not api_key:
                self.wfile.write(json.dumps({
                    'error': 'API key required. Set X-API-Key header.'
                }).encode('utf-8'))
                return
            
            # Forward request to OpenAI
            openai_url = 'https://api.openai.com/v1/chat/completions'
            openai_request = urllib.request.Request(
                openai_url,
                data=json.dumps(request_data).encode('utf-8'),
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                }
            )
            
            with urllib.request.urlopen(openai_request) as response:
                response_data = response.read()
                self.wfile.write(response_data)
                
        except Exception as e:
            error_response = {
                'error': f'API request failed: {str(e)}'
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

def main():
    print(f"Starting Anvil & Loom JSON Explorer on http://{HOST}:{PORT}")
    print("Available endpoints:")
    print(f"  - http://{HOST}:{PORT}/ (main app)")
    print(f"  - http://{HOST}:{PORT}/api/batch-generate (AI generation)")
    print(f"  - http://{HOST}:{PORT}/api/chat (OpenAI chat)")
    print(f"  - http://{HOST}:{PORT}/api/openai (OpenAI proxy)")
    print("Make sure index.html is in the same directory as this script")
    print("Press Ctrl+C to stop the server")
    
    try:
        with socketserver.TCPServer((HOST, PORT), AnvilLoomHandler) as httpd:
            print(f"\n✓ Server is now running at http://{HOST}:{PORT}")
            print("✓ Ready to accept requests!")
            print(f"✓ Open your browser to http://{HOST}:{PORT}")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except OSError as e:
        if e.errno == 48:  # Address already in use on Mac/Linux
            print(f"\nError: Port {PORT} is already in use.")
            print("Either stop the other server or change the PORT variable.")
            print("Try: lsof -ti:5000 | xargs kill")
        elif e.errno == 10048:  # Address already in use on Windows
            print(f"\nError: Port {PORT} is already in use.")
            print("Either stop the other server or change the PORT variable.")
            print("Try: netstat -ano | findstr :5000")
        else:
            print(f"Error starting server: {e}")
    except Exception as e:
        print(f"Error starting server: {e}")
        print("Make sure port 5000 is not already in use")

if __name__ == "__main__":
    main()