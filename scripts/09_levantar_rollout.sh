et -euo pipefail
 
fail() { echo "ERROR: $*" >&2; exit 1; }
warn() { echo "WARN: $*" >&2; }
ok()   { echo "OK: $*"; }
 
# Parámetros (Finlab standard)
CLUSTER="finlab"
NAMESPACE="finlab"
HOST_REG="localhost:5001"                 # push target desde WSL
K3D_REG_NAME="finlab-registry"
INTERNAL_REG="${K3D_REG_NAME}:5000"       # pull target desde nodos k3d
TAG="${TAG:-0.1.0}"                       # permite override: TAG=0.1.1 ./scripts/10_finlab_all.sh
 
echo "== Finlab: full lab run =="
echo "Cluster:      $CLUSTER"
echo "Namespace:    $NAMESPACE"
echo "Host registry (push):     $HOST_REG"
echo "Internal registry (pull): $INTERNAL_REG"
echo "Tag:          $TAG"
 
echo
echo "== Build & push images to host registry =="
[ -d "./apps/backend" ] || fail "No existe ./apps/backend. Ejecuta desde la raíz del repo."
[ -d "./apps/frontend" ] || fail "No existe ./apps/frontend. Ejecuta desde la raíz del repo."
 
docker build -t "${HOST_REG}/${NAMESPACE}/backend:${TAG}" ./apps/backend
docker build -t "${HOST_REG}/${NAMESPACE}/frontend:${TAG}" ./apps/frontend
 
docker push "${HOST_REG}/${NAMESPACE}/backend:${TAG}"
docker push "${HOST_REG}/${NAMESPACE}/frontend:${TAG}"
ok "Imágenes publicadas en ${HOST_REG}"
 
echo
echo "== Wait rollout =="
kubectl -n "$NAMESPACE" rollout status deploy/backend --timeout=180s || {
  echo "Rollout backend falló. Diagnóstico:"
  kubectl -n "$NAMESPACE" get pods -o wide || true
  kubectl -n "$NAMESPACE" get events --sort-by=.lastTimestamp | tail -n 40 || true
  kubectl -n "$NAMESPACE" describe pod -l app=backend | egrep -i "Image:|Failed|pull|Back-off|Err" || true
  exit 60
}
 
kubectl -n "$NAMESPACE" rollout status deploy/frontend --timeout=180s