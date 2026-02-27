output "cluster_name" {
  description = "Nombre del cluster creado en k3d"
  value       = var.cluster_name
}

output "namespace" {
  description = "Namespace donde se desplegó la aplicación"
  value       = var.namespace
}

output "release_name" {
  description = "Nombre del release de Helm"
  value       = var.release_name
}

output "registry_info" {
  description = "Registry local utilizado por las imágenes"
  value       = "finlab-registry:5000"
}

output "port_forward_frontend" {
  description = "Comando para acceder al frontend"
  value       = "kubectl port-forward svc/${var.release_name}-frontend 8080:80 -n ${var.namespace}"
}

output "check_pods" {
  description = "Comando para revisar el estado de los pods"
  value       = "kubectl get pods -n ${var.namespace}"
}