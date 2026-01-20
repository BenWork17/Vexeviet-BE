@echo off
REM Database Migration Script for Windows
setlocal enabledelayedexpansion

echo ===============================
echo VeXeViet Database Migration
echo ===============================
echo.

REM Check if Docker is running
docker info >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop.
    exit /b 1
)

REM Start MySQL and Redis if not running
echo Starting database services...
docker-compose up -d mysql redis

REM Wait for MySQL to be ready
echo Waiting for MySQL to be ready...
set timeout=60
set counter=0

:wait_mysql
docker-compose exec -T mysql mysqladmin ping -h localhost --silent >nul 2>nul
if %ERRORLEVEL% equ 0 goto mysql_ready

timeout /t 1 /nobreak >nul
set /a counter+=1
if %counter% geq %timeout% (
    echo ERROR: MySQL failed to start within %timeout% seconds
    exit /b 1
)
goto wait_mysql

:mysql_ready
echo MySQL is ready!

REM Generate Prisma Client
echo Generating Prisma Client...
cd packages\database
call pnpm prisma:generate

REM Run migrations
echo Running database migrations...
call pnpm prisma migrate dev --name init

echo.
echo ===============================
echo Database migration complete!
echo ===============================
echo.
echo Database Info:
echo   Host: localhost:3306
echo   Database: vexeviet
echo   User: vexeviet_user
echo.
echo Useful commands:
echo   pnpm prisma:studio          - Open Prisma Studio
echo   pnpm prisma migrate create  - Create new migration
echo   pnpm prisma migrate deploy  - Deploy migrations (production)
