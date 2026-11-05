-- Pricing from one place (Chirag, 2026-11-04): Admin → Content sets the price and the crossed-out
-- "original" price. The website and both checkouts read them from the LMS (/api/price).
alter table public.courses add column list_price_inr int;
update public.courses set list_price_inr = 2499 where id = 'ai-for-students';
-- A price of ₹0 would break UPI claims (amount must be > 0); the original price must not be below the price.
alter table public.courses
  add constraint courses_price_range check (price_inr between 1 and 100000),
  add constraint courses_list_price_range check (list_price_inr is null or list_price_inr between price_inr and 100000);
