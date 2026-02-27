resource "null_resource" "build_images" {

  depends_on = [null_resource.cluster]

  provisioner "local-exec" {
    command = <<EOT
docker build -t localhost:5001/${var.namespace}/frontend:${var.tag} ./apps/frontend
docker push localhost:5001/${var.namespace}/frontend:${var.tag}

docker build -t localhost:5001/${var.namespace}/auth:${var.tag} ./apps/auth-service
docker build -t localhost:5001/${var.namespace}/cart:${var.tag} ./apps/cart-service
docker build -t localhost:5001/${var.namespace}/product:${var.tag} ./apps/product-service

docker push localhost:5001/${var.namespace}/auth:${var.tag}
docker push localhost:5001/${var.namespace}/cart:${var.tag}
docker push localhost:5001/${var.namespace}/product:${var.tag}
EOT
  }

  triggers = {
    tag = var.tag
  }
}