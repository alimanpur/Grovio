/**
 * Isolated receipt printing.
 *
 * The billing workspace holds a product search, a cart editor, payment
 * controls and the receipt side by side. Printing the page would dump all
 * of it (often across several sheets). This copies just the receipt node
 * (`#receipt-print`) into a dedicated print root and hides the app, so only
 * the selected bill's invoice reaches the printer.
 */
export function printReceipt() {
  // Never stack clones from repeated prints.
  document.querySelectorAll('.gv-print-root').forEach((n) => n.remove())

  const source = document.getElementById('receipt-print')
  if (!source) {
    // No isolated receipt present — fall back to the browser print dialog.
    window.print()
    return
  }

  const root = document.createElement('div')
  root.className = 'gv-print-root'
  const paper = document.createElement('div')
  paper.className = 'gv-print-paper'
  paper.appendChild(source.cloneNode(true))
  root.appendChild(paper)
  document.body.appendChild(root)
  document.body.classList.add('printing')

  const cleanup = () => {
    root.remove()
    document.body.classList.remove('printing')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

export default printReceipt
