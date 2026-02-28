#!/bin/bash

# ===============================
# HypeKicks Health Stress Test
# Using BusyBox
# ===============================

SERVICE_NAME=$1
PORT=$2
SLEEP_TIME=${3:-0.001}

NAMESPACE="finlab"

if [ -z "$SERVICE_NAME" ] || [ -z "$PORT" ]; then
  echo "Uso:"
  echo "./stress-health.sh <service-name> <port> [sleep-time]"
  echo ""
  echo "Ejemplo:"
  echo "./stress-health.sh finlab-auth 3001 0.001"
  exit 1
fi

echo "🔥 Iniciando stress infinito contra $SERVICE_NAME:$PORT/health"
echo "⏱ Sleep entre requests: $SLEEP_TIME"
echo "Presiona CTRL+C para detener"
echo "---------------------------------------------"

kubectl run -i --tty load-generator \
  --rm \
  --image=busybox:1.28 \
  --namespace=$NAMESPACE \
  --restart=Never \
  -- /bin/sh -c "while sleep $SLEEP_TIME; do wget -q -O- http://$SERVICE_NAME:$PORT/health; done"