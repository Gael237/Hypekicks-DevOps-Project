resource "null_resource" "cluster" {

  provisioner "local-exec" {
    command = <<EOT
k3d cluster delete ${var.cluster_name} || true

k3d cluster create ${var.cluster_name} \
  --agents 2 \
  --registry-create finlab-registry:0.0.0.0:5001

kubectl create ns ${var.namespace} || true
EOT
  }

  triggers = {
    always_run = timestamp()
  }
}