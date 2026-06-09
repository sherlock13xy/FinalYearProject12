"""
Run this script ONCE with Chrome fully closed to extract your Instagram session ID.
It will automatically add INSTAGRAM_SESSION_ID to your .env file.
"""
import os
import re

try:
    import browser_cookie3
except ImportError:
    print("Installing browser_cookie3...")
    os.system("python -m pip install browser-cookie3")
    import browser_cookie3

ENV_FILE = os.path.join(os.path.dirname(__file__), ".env")

def get_session_id():
    for browser_name, loader in [("Chrome", browser_cookie3.chrome), ("Edge", browser_cookie3.edge)]:
        try:
            cj = loader(domain_name=".instagram.com")
            for c in cj:
                if c.name == "sessionid":
                    print(f"Found sessionid in {browser_name}.")
                    return c.value
        except Exception as e:
            print(f"{browser_name}: {e}")
    return None

session_id = get_session_id()

if not session_id:
    print("\nCould not extract automatically.")
    print("Manual steps:")
    print("  1. Open Chrome → go to instagram.com (stay logged in)")
    print("  2. Press F12 → Application tab → Cookies (left sidebar) → https://www.instagram.com")
    print("  3. Find 'sessionid' row, click it, copy the Value field")
    session_id = input("\nPaste sessionid value here: ").strip()

if not session_id:
    print("No session ID provided. Exiting.")
    exit(1)

# Read existing .env
with open(ENV_FILE, "r") as f:
    content = f.read()

if "INSTAGRAM_SESSION_ID" in content:
    content = re.sub(r"INSTAGRAM_SESSION_ID=.*", f"INSTAGRAM_SESSION_ID={session_id}", content)
else:
    content = content.rstrip() + f"\nINSTAGRAM_SESSION_ID={session_id}\n"

with open(ENV_FILE, "w") as f:
    f.write(content)

print(f"\nDone! INSTAGRAM_SESSION_ID saved to .env")
print("Restart your backend server and Instagram URLs should work.")
