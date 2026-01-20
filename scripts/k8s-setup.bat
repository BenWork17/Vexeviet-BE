@echo off
REM VeXeViet Kubernetes Setup Script for Windows
REM Creates a local Kubernetes cluster using kind (Kubernetes in Docker)

echo ==============================
echo VeXeViet Kubernetes Setup
echo ==============================
echo.

REM Check if kind is installed
where kind >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: kind is not installed. Please install it first:
    echo   choco install kind
    echo   https://kind.sigs.k8s.io/docs/user/quick-start/
    exit /b 1
)

REM Check if kubectl is installed
where kubectl >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: kubectl is not installed. Please install it first:
    echo   choco install kubernetes-cli
    echo   https://kubernetes.io/docs/tasks/tools/
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop.
    exit /b 1
)

REM Delete existing cluster if it exists
kind get clusters | findstr "vexeviet" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Deleting existing cluster...
    kind delete cluster --name vexeviet
)

REM Create cluster config file
echo Creating cluster configuration...
(
echo kind: Cluster
echo apiVersion: kind.x-k8s.io/v1alpha4
echo nodes:
echo - role: control-plane
echo   extraPortMappings:
echo   - containerPort: 80
echo     hostPort: 80
echo     protocol: TCP
echo   - containerPort: 443
echo     hostPort: 443
echo     protocol: TCP
echo - role: worker
echo - role: worker
) > kind-config.yaml

REM Create new cluster
echo Creating Kubernetes cluster...
kind create cluster --name vexeviet --config kind-config.yaml
del kind-config.yaml

REM Wait for cluster to be ready
echo Waiting for cluster to be ready...
kubectl wait --for=condition=Ready nodes --all --timeout=300s

REM Create namespace
echo Creating namespace...
kubectl apply -f .\k8s\namespace.yaml

echo.
echo ==============================
echo Kubernetes cluster is ready!
echo ==============================
echo.
echo Next steps:
echo 1. Update secrets in k8s\secrets-example.yaml
echo 2. Apply secrets: kubectl apply -f k8s\secrets-example.yaml
echo 3. Deploy services: cd services\user-service ^&^& kubectl apply -f k8s\
echo.
echo Useful commands:
echo   kubectl get pods -n vexeviet
echo   kubectl logs -f ^<pod-name^> -n vexeviet
echo   kubectl get services -n vexeviet
echo   kind delete cluster --name vexeviet
