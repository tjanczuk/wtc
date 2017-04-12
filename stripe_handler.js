'use strict';

module.exports = class StripeHandler {
  
  // Methods of this class correspond to individual Stripe webhook events. 
  // If a method is not defined when a webhook event is raised, an HTTP 400 response will 
  // be sent back to Stripe.
  // All methods accept the request payload Stripe has sent as the first parameter.
  // The second, optional parameter is the callback function.
  // If callback is not specified in the parameter list, an HTTP 200 response is
  // automatically sent before the method is executed. 
  // If you do specify a callback, you need to call it yourself without
  // parameters to indicate success or with an error to signal an error. 
  
  // Stripe event documentation:
  // https://stripe.com/docs/api#event_types

  // 'account.updated'(data) {}
  // 'account.external_account.created'(data) {}
  // 'account.external_account.updated'(data) {}
  // 'account.external_account.deleted'(data) {}
  // 'balance.available'(data) {}
  // 'bitcoin.receiver.created'(data) {}
  // 'bitcoin.receiver.filled'(data) {}
  // 'bitcoin.receiver.updated'(data) {}
  // 'bitcoin.receiver.transaction.created'(data) {}
  // 'charge.captured'(data) {}
  // 'charge.failed'(data) {}
  // 'charge.pending'(data) {}
  // 'charge.refunded'(data) {}
  // 'charge.succeeded'(data) {}
  // 'charge.updated'(data) {}
  // 'charge.dispute.closed'(data) {}
  // 'charge.dispute.created'(data) {}
  // 'charge.dispute.funds_reinstated'(data) {}
  // 'charge.dispute.funds_withdrawn'(data) {}
  // 'charge.dispute.updated'(data) {}
  // 'coupon.created'(data) {}
  // 'coupon.deleted'(data) {}
  // 'coupon.updated'(data) {}
  // 'customer.created'(data) {}
  // 'customer.deleted'(data) {}
  // 'customer.updated'(data) {}
  // 'customer.bank_account.deleted'(data) {}
  // 'customer.discount.created'(data) {}
  // 'customer.discount.deleted'(data) {}
  // 'customer.discount.updated'(data) {}
  // 'customer.source.created'(data) {}
  // 'customer.source.deleted'(data) {}
  // 'customer.source.updated'(data) {}
  // 'customer.subscription.created'(data) {}
  // 'customer.subscription.deleted'(data) {}
  // 'customer.subscription.trial_will_end'(data) {}
  // 'customer.subscription.updated'(data) {}
  // 'invoice.created'(data) {}
  // 'invoice.payment_failed'(data) {}
  // 'invoice.payment_succeeded'(data) {}
  // 'invoice.sent'(data) {}
  // 'invoice.updated'(data) {}
  // 'invoiceitem.created'(data) {}
  // 'invoiceitem.deleted'(data) {}
  // 'invoiceitem.updated'(data) {}
  // 'order.created'(data) {}
  // 'order.payment_failed'(data) {}
  // 'order.payment_succeeded'(data) {}
  // 'order.updated'(data) {}
  // 'order_return.created'(data) {}
  // 'plan.created'(data) {}
  // 'plan.deleted'(data) {}
  // 'plan.updated'(data) {}
  // 'product.created'(data) {}
  // 'product.deleted'(data) {}
  // 'product.updated'(data) {}
  // 'recipient.created'(data) {}
  // 'recipient.deleted'(data) {}
  // 'recipient.updated'(data) {}
  // 'review.closed'(data) {}
  // 'review.opened'(data) {}
  // 'sku.created'(data) {}
  // 'sku.deleted'(data) {}
  // 'sku.updated'(data) {}
  // 'source.canceled'(data) {}
  // 'source.chargeable'(data) {}
  // 'source.failed'(data) {}
  // 'source.transaction.created'(data) {}
  // 'transfer.created'(data) {}
  // 'transfer.failed'(data) {}
  // 'transfer.paid'(data) {}
  // 'transfer.reversed'(data) {}
  // 'transfer.updated'(data) {}
};
