@echo off
rem Lance le portfolio dans le navigateur par défaut (Opera GX) : http://localhost:8777
rem Laisser cette fenêtre ouverte tant qu'on regarde le site ; la fermer arrête le serveur.
cd /d "%~dp0"
title Portfolio Koma - serveur local (ne pas fermer)
rem le navigateur s'ouvre 2 secondes après, le temps que le serveur démarre
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:8777/?r=%RANDOM%"
py -3.13 -m http.server 8777 || python -m http.server 8777
pause
