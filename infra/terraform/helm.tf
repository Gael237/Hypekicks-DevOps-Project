provider "helm" {
  kubernetes = {
    config_path = "~/.kube/config"
  }
}

resource "helm_release" "finlab" {

  depends_on = [null_resource.build_images]

  name       = var.release_name
  namespace  = var.namespace
  chart      = "../helm/finlab"

  set = [
    {
      name  = "registry"
      value = "finlab-registry:5000"
    },
    {
      name  = "frontend.image"
      value = "${var.namespace}/frontend"
    },
    {
      name  = "frontend.tag"
      value = var.tag
    }
  ]
}