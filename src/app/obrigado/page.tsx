import Link from "next/link"

export default function Obrigado() {
  return (
    <main className="container section">
      <div className="card panel">
        <h1>Pedido recebido!</h1>
        <p>Seu pagamento foi iniciado. A Exale entrará em contato para confirmar os detalhes.</p>
        <Link className="btn btn-pink" href="/">Voltar para loja</Link>
      </div>
    </main>
  )
}
