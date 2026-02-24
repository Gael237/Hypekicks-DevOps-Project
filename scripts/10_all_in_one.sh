#!/usr/bin/env bash
set -euo pipefail

fail() { echo "ERROR: $*" >&2; exit 1; }
warn() { echo "WARN: $*" >&2; }
ok()   { echo "OK: $*"; }

CLUSTER="finlab"
RELEASE="finlab"
NAMESPACE="finlab"
HOST_REG="localhost:5001"
K3D_REG_NAME="finlab-registry"
INTERNAL_REG="${K3D_REG_NAME}:5000"
TAG="${TAG:-0.1.0}"

echo "== Finlab: full lab run =="
echo "Cluster:      $CLUSTER"
echo "Release:      $RELEASE"
echo "Namespace:    $NAMESPACE"
echo "Host registry (push):     $HOST_REG"
echo "Internal registry (pull): $INTERNAL_REG"
echo "Tag:          $TAG"
echo

# =========================================================
# 0) Validate
# =========================================================

docker ps >/dev/null 2>&1 || fail "Docker no accesible sin sudo."

# =========================================================
# 1) Reset cluster
# =========================================================

echo "== Reset cluster =="
k3d cluster delete "$CLUSTER" >/dev/null 2>&1 || true

# =========================================================
# 2) Create cluster + registry
# =========================================================

echo "== Create cluster (k3d) =="

k3d cluster create "$CLUSTER" \
  --agents 2 \
  --registry-create "${K3D_REG_NAME}:0.0.0.0:5001"

kubectl create ns "$NAMESPACE" >/dev/null 2>&1 || true
ok "Cluster creado"

# =========================================================
# Build & Push Images
# =========================================================

echo "== Build & push frontend =="

docker build -t "${HOST_REG}/${NAMESPACE}/frontend:${TAG}" ./apps/frontend
docker push "${HOST_REG}/${NAMESPACE}/frontend:${TAG}"

echo "== Build & push microservices =="

docker build -t "${HOST_REG}/${NAMESPACE}/auth:${TAG}" ./apps/auth-service
docker build -t "${HOST_REG}/${NAMESPACE}/cart:${TAG}" ./apps/cart-service
docker build -t "${HOST_REG}/${NAMESPACE}/product:${TAG}" ./apps/product-service

docker push "${HOST_REG}/${NAMESPACE}/auth:${TAG}"
docker push "${HOST_REG}/${NAMESPACE}/cart:${TAG}"
docker push "${HOST_REG}/${NAMESPACE}/product:${TAG}"

ok "Todas las imágenes publicadas"

# =========================================================
# Registry connectivity check
# =========================================================

docker exec "k3d-${CLUSTER}-server-0" sh -c "nslookup ${K3D_REG_NAME} >/dev/null" \
  || fail "El nodo no puede resolver registry"

docker exec "k3d-${CLUSTER}-server-0" sh -c "wget -qO- http://${K3D_REG_NAME}:5000/v2/ >/dev/null" \
  || fail "El nodo no puede acceder al registry"

# =========================================================
# Deploy with Helm
# =========================================================

echo "== Deploy via Helm =="

helm upgrade --install "$RELEASE" ./infra/helm/finlab \
  -n "$NAMESPACE" \
  --create-namespace \
  --set registry="$INTERNAL_REG" \
  --set frontend.image="${NAMESPACE}/frontend" \
  --set frontend.tag="$TAG"

# =========================================================
# Wait rollouts
# =========================================================

echo "== Wait rollout =="

for svc in auth cart product frontend; do
  echo "Waiting rollout $svc ..."
  kubectl -n "$NAMESPACE" rollout status deploy/${RELEASE}-${svc} --timeout=180s || {
    echo "Rollout $svc falló"
    kubectl -n "$NAMESPACE" get pods -o wide
    kubectl -n "$NAMESPACE" describe deploy ${RELEASE}-${svc}
    exit 61
  }
done

echo
kubectl -n "$NAMESPACE" get deploy,svc,pods -o wide

# =========================================================
# Self-healing test (AUTH)
# =========================================================

echo "== Self-healing test (delete auth pod) =="

AUTH_POD="$(kubectl -n "$NAMESPACE" get pod -l app=${RELEASE}-auth -o jsonpath='{.items[0].metadata.name}')"

kubectl -n "$NAMESPACE" delete pod "$AUTH_POD" >/dev/null
kubectl -n "$NAMESPACE" rollout status deploy/${RELEASE}-auth

ok "Self-healing validado"
echo "== DONE =="