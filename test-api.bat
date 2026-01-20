@echo off
echo Waiting for MySQL to be ready...
timeout /t 10 /nobreak > nul

echo Running Prisma migrations...
cd packages\database
set DATABASE_URL=mysql://root:root@localhost:3306/vexeviet
call npx prisma migrate dev --name init --skip-seed

echo.
echo Starting services...
cd ..\..
start "API Gateway" cmd /k "pnpm --filter @vexeviet/api-gateway dev"
timeout /t 3 /nobreak > nul
start "User Service" cmd /k "pnpm --filter @vexeviet/user-service dev"

echo.
echo ===================================
echo Services starting...
echo API Gateway: http://localhost:3000
echo User Service: http://localhost:3001
echo ===================================
echo.
echo Testing in 10 seconds...
timeout /t 10 /nobreak > nul

echo.
echo === TEST 1: Health Check ===
curl http://localhost:3000/health

echo.
echo.
echo === TEST 2: Register User ===
curl -X POST http://localhost:3000/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"method\":\"email\",\"email\":\"test@example.com\",\"password\":\"Test1234\",\"firstName\":\"Test\",\"lastName\":\"User\",\"agreeToTerms\":true}"

echo.
echo.
echo Done! Check the responses above.
pause
