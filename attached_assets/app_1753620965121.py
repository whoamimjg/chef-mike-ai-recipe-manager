#!/usr/bin/env python3
"""
Chef Mike's Culinary Classroom - Direct React Server
No Streamlit - just launches the Node.js React server directly on port 5000
"""

import subprocess
import sys
import os
import signal
import shutil

def main():
    """Start the React server directly on port 5000"""
    print("=== Chef Mike's Culinary Classroom ===")
    print("Starting React application...")
    
    # Verify Node.js
    if not shutil.which('node'):
        print("ERROR: Node.js not available")
        sys.exit(1)
    
    # Set directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Verify server file
    if not os.path.exists('server-minimal.js'):
        print("ERROR: server-minimal.js not found")
        sys.exit(1)
    
    # Environment setup
    env = os.environ.copy()
    env['PORT'] = '5000'
    env['NODE_ENV'] = 'production'
    
    print("Starting React server on port 5000...")
    
    try:
        # Start React server - this becomes the main process
        process = subprocess.Popen(
            ['node', 'server-minimal.js'],
            stdout=sys.stdout,
            stderr=sys.stderr,
            env=env
        )
        
        print(f"React server running (PID: {process.pid})")
        print("Chef Mike's Culinary Classroom is live!")
        
        # Signal handlers
        def signal_handler(signum, frame):
            print("\nShutting down...")
            try:
                process.terminate()
                process.wait(timeout=5)
            except:
                process.kill()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Wait for React server
        return_code = process.wait()
        sys.exit(return_code)
        
    except Exception as e:
        print(f"ERROR: Failed to start React server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()