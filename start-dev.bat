@echo off
echo ========================================
echo  VeXeViet Backend - Development Mode
echo ========================================
echo.
echo Starting Docker services...
call pnpm docker:up
echo.
echo Waiting 5 seconds for Docker to initialize...
timeout /t 5 /nobreak > nul
echo.
echo Starting all microservices...
echo.
call pnpm dev:services
