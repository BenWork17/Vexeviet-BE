@echo off
echo [VeXeViet BE] Starting local infrastructure (MySQL + Redis)...
call pnpm docker:up
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo [VeXeViet BE] Building shared workspace packages...
call pnpm dev:packages
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%

echo [VeXeViet BE] Starting API Gateway (:3000) and Microservices (:3001..3004)...
call pnpm dev:services
