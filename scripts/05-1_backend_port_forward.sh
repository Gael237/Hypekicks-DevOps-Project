#!/usr/bin/env bash
set -euo pipefail
NAMESPACE=finlab
echo "Abriendo backend en http://localhost:3001"
kubectl -n ${NAMESPACE} port-forward svc/finlab-auth 3001:3001