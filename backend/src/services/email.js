const { Resend } = require('resend')
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Envia e-mail de relatório diário para o admin do tenant.
 */
async function sendDailyReport(to, tenantName, stats) {
  return resend.emails.send({
    from: 'Sirius <noreply@sirius.app>',
    to,
    subject: `Relatório diário — ${tenantName}`,
    html: `
      <h2>Relatório de hoje — ${tenantName}</h2>
      <p>Tickets abertos: <strong>${stats.tickets_opened}</strong></p>
      <p>Tickets fechados: <strong>${stats.tickets_closed}</strong></p>
      <p>Resolvidos pelo bot: <strong>${stats.bot_resolved}</strong></p>
      <p>Satisfação média: <strong>${stats.avg_satisfaction ? stats.avg_satisfaction.toFixed(1) + '/5' : 'sem avaliações'}</strong></p>
      <p>Tempo médio de atendimento: <strong>${stats.avg_duration_min} min</strong></p>
    `,
  })
}

/**
 * Alerta de ticket sem atendente.
 */
async function sendTicketAlert(to, tenantName, ticketId, contactName, minutesWaiting) {
  return resend.emails.send({
    from: 'Sirius <noreply@sirius.app>',
    to,
    subject: `⚠️ Ticket sem atendimento há ${minutesWaiting} min — ${tenantName}`,
    html: `
      <p>O ticket de <strong>${contactName}</strong> está na fila há <strong>${minutesWaiting} minutos</strong> sem atendente.</p>
      <p><a href="${process.env.FRONTEND_URL}/atendimento?ticket=${ticketId}">Abrir ticket</a></p>
    `,
  })
}

module.exports = { sendDailyReport, sendTicketAlert }
