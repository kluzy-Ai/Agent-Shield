@echo off
set EDGE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set ARTDIR=C:\Users\Promise\.gemini\antigravity\brain\232ce36d-b314-4570-b0b6-21915ae5e035

echo Capturing 1. Public Threat Repository (signed out)...
%EDGE% --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --user-data-dir="%TEMP%\edge_shot1" --screenshot="%ARTDIR%\public_repo_signed_out.png" --window-size=1440,900 "http://localhost:3000/?view=intel"

echo Capturing 2. Threat Report Submit Form (with notice and plain text)...
%EDGE% --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --user-data-dir="%TEMP%\edge_shot2" --screenshot="%ARTDIR%\submit_form.png" --window-size=1440,900 "http://localhost:3000/?view=report"

echo Capturing 3. Flagged and Hidden Report...
%EDGE% --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --user-data-dir="%TEMP%\edge_shot3" --screenshot="%ARTDIR%\flagged_and_hidden_report.png" --window-size=1440,900 "http://localhost:3000/?view=report&tab=my-reports"

echo Capturing 4. Admin Takedown View (Platform Owner Gated)...
%EDGE% --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --user-data-dir="%TEMP%\edge_shot4" --screenshot="%ARTDIR%\admin_takedown_view.png" --window-size=1440,900 "http://localhost:3000/?view=takedown&as_platform_owner=1"

echo All screenshots captured!
