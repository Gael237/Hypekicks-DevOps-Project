#!/usr/bin/env bash
set -euo pipefail

fail() { echo "ERROR: $*" >&2; exit 1; }
ok()   { echo "OK: $*"; }

CLUSTER="finlab"
RELEASE="finlab"
NAMESPACE="finlab"

echo "== Finlab: Full Terraform Lab Run =="
echo "Cluster:    $CLUSTER"
echo "Release:    $RELEASE"
echo "Namespace:  $NAMESPACE"
echo

# =========================================================
# 0) Validate Docker
# =========================================================

docker ps >/dev/null 2>&1 || fail "Docker no accesible sin sudo."
ok "Docker funcionando"

# =========================================================
# 1) Terraform Infrastructure + Deploy
# =========================================================

echo
echo "== Terraform: Infraestructura y Deploy =="

cd infra/terraform

terraform init
terraform validate
terraform plan -out=tfplan
terraform apply -auto-approve tfplan

cd ..

ok "Infraestructura y microservicios desplegados con Terraform"

# =========================================================
# 2) Wait Rollouts
# =========================================================

echo
echo "== Esperando rollouts =="

for svc in auth cart product frontend; do
  echo "Waiting rollout $svc ..."
  kubectl -n "$NAMESPACE" rollout status deploy/${RELEASE}-${svc} --timeout=180s || {
    echo "Rollout $svc falló"
    kubectl -n "$NAMESPACE" get pods -o wide
    kubectl -n "$NAMESPACE" describe deploy ${RELEASE}-${svc}
    exit 61
  }
done

kubectl -n "$NAMESPACE" get deploy,svc,pods -o wide

ok "Todos los rollouts completados"

# =========================================================
# 3) Self-Healing Test (AUTH)
# =========================================================

echo
echo "== Self-healing test (delete auth pod) =="

AUTH_POD="$(kubectl -n "$NAMESPACE" get pod -l app=${RELEASE}-auth -o jsonpath='{.items[0].metadata.name}')"

kubectl -n "$NAMESPACE" delete pod "$AUTH_POD" >/dev/null
kubectl -n "$NAMESPACE" rollout status deploy/${RELEASE}-auth

ok "Self-healing validado correctamente"

echo
echo "== DONE =="