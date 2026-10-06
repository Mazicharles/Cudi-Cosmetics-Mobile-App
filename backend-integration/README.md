# Existing web backend integration

This repository contains only the mobile app. It calls the existing Cudi Cosmetics web shop and the same Supabase project.

The companion web repository is https://github.com/Mazicharles/cudi-cosmetics and the deployment is https://cudi-cosmetics.vercel.app.

If the web deployment does not yet include mobile support, apply web-api-and-cart.patch from the web repository root using git apply, then run its build, lint and tests and deploy it. The patch adds verified Supabase Bearer-token authentication to checkout and payment retry, returns order_id from payment initialization, and refreshes the web cart on browser focus. Existing cookie authentication and payment processing remain intact.

003_cart_realtime.sql is optional and must be applied to the existing Supabase project. Do not create a second backend.

Tests compare copied mobile schemas with the web-contract fixtures captured when extracting this repository. Refresh those fixtures when the web contract changes; they no longer automatically read a neighboring web checkout.
