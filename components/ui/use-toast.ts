type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function toast(props: ToastProps) {
  // In a real implementation, this would manage a toast state
  // For our demo, we're using a simplified version
  console.log("Toast:", props)

  // Create a simple browser alert as fallback
  alert(`${props.title}\n${props.description}`)
}
