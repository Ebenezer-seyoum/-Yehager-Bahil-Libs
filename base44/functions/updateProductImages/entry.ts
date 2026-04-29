import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { unique_id, images } = await req.json();

    if (!unique_id || !images || !Array.isArray(images)) {
      return Response.json({ error: 'Missing unique_id or images' }, { status: 400 });
    }

    // Find product by unique_id
    const products = await base44.asServiceRole.entities.Product.filter({ unique_id });

    if (products.length === 0) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = products[0];

    // Update product with new images
    const updated = await base44.asServiceRole.entities.Product.update(product.id, {
      images
    });

    return Response.json({ success: true, product: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});