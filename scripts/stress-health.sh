diff --git a/infra/helm/finlab/templates/auth-svc.yaml b/infra/helm/finlab/templates/auth-svc.yaml
index 1111111..2222222 100644
--- a/infra/helm/finlab/templates/auth-svc.yaml
+++ b/infra/helm/finlab/templates/auth-svc.yaml
@@ -5,7 +5,7 @@ metadata:
   namespace: {{ .Release.Namespace }}
spec:
   selector:
-    app: auth
+    app: {{ .Release.Name }}-auth
   ports:
     - port: 3001
       targetPort: {{ .Values.auth.port }}
 
diff --git a/scripts/stress-health.sh b/scripts/stress-health.sh
index 3333333..4444444 100755
--- a/scripts/stress-health.sh
+++ b/scripts/stress-health.sh
@@ -14,11 +14,23 @@ DURATION=${DURATION:-60s}
RPS=${RPS:-0}
K6_IMAGE=${K6_IMAGE:-grafana/k6:0.49.0}
-TARGET_PATH=${TARGET_PATH:-/api/products}
+TARGET_PATH=${TARGET_PATH:-}
PAYLOAD_SIZE=${PAYLOAD_SIZE:-0}
+WAIT_TIMEOUT=${WAIT_TIMEOUT:-60}
+
+if [ -z "$TARGET_PATH" ]; then
+  if [ -z "$SERVICE_NAME" ]; then
+    TARGET_PATH="/api/products"
+  else
+    case "$SERVICE_NAME" in
+      *product*) TARGET_PATH="/api/products" ;;
+      *auth*) TARGET_PATH="/healthz" ;;
+      *) TARGET_PATH="/healthz" ;;
+    esac
+  fi
+fi
if [ -n "$SERVICE_NAME" ] && [ -n "$PORT" ]; then
   LEGACY_TARGET="http://$SERVICE_NAME:$PORT$TARGET_PATH"
else
-  LEGACY_TARGET="http://finlab-product:3003$TARGET_PATH"
+  LEGACY_TARGET="http://finlab-product:3003${TARGET_PATH:-/api/products}"
fi
TARGET_URL=${TARGET_URL:-$LEGACY_TARGET}
@@ -31,10 +43,35 @@ if ! command -v kubectl >/dev/null 2>&1; then
   exit 1
fi
-if ! kubectl -n "$NAMESPACE" get ns "$NAMESPACE" >/dev/null 2>&1; then
+if ! kubectl get ns "$NAMESPACE" >/dev/null 2>&1; then
   echo "ERROR: namespace '$NAMESPACE' no disponible en el contexto actual."
   exit 1
fi
+
+if [ -n "$SERVICE_NAME" ]; then
+  if ! kubectl -n "$NAMESPACE" get svc "$SERVICE_NAME" >/dev/null 2>&1; then
+    echo "ERROR: service '$SERVICE_NAME' no existe en namespace '$NAMESPACE'."
+    exit 1
+  fi
+
+  echo "Esperando endpoints listos para $SERVICE_NAME (timeout: ${WAIT_TIMEOUT}s)..."
+  end=$((SECONDS + WAIT_TIMEOUT))
+  while [ "$SECONDS" -lt "$end" ]; do
+    if kubectl -n "$NAMESPACE" get endpoints "$SERVICE_NAME" \
+      -o jsonpath='{.subsets[0].addresses[0].ip}' 2>/dev/null | grep -qE '.'; then
+      break
+    fi
+    sleep 2
+  done
+
+  if ! kubectl -n "$NAMESPACE" get endpoints "$SERVICE_NAME" \
+    -o jsonpath='{.subsets[0].addresses[0].ip}' 2>/dev/null | grep -qE '.'; then
+    echo "ERROR: service '$SERVICE_NAME' sin endpoints listos. Revisa selector/labels/readiness."
+    kubectl -n "$NAMESPACE" get svc "$SERVICE_NAME" -o wide || true
+    kubectl -n "$NAMESPACE" get endpoints "$SERVICE_NAME" -o wide || true
+    exit 1
+  fi
+fi