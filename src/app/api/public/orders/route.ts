import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantId, tableId, tableLabel, items, customerNote, language } = body;

    if (!restaurantId || !tableId || !tableLabel || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Anti-abuse: limit number of unique items per order
    if (items.length > 20) {
      return NextResponse.json({ error: 'Too many items in a single order (max 20)' }, { status: 400 });
    }

    // Anti-abuse: limit customer note length
    if (customerNote && customerNote.length > 300) {
      return NextResponse.json({ error: 'Customer note is too long (max 300 characters)' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, status')
      .eq('id', restaurantId)
      .eq('status', 'ACTIVE')
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found or inactive' }, { status: 404 });
    }

    const { data: table } = await supabase
      .from('tables')
      .select('id, is_active, ordering_enabled')
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!table?.ordering_enabled) {
      return NextResponse.json({ error: 'Table not available for ordering' }, { status: 400 });
    }

    const existingOrder = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', tableId)
      .in('status', ['CREATED', 'ACCEPTED'])
      .maybeSingle();

    if (existingOrder.data) {
      return NextResponse.json({ error: 'This table already has an active order' }, { status: 409 });
    }

    let total = 0;
    for (const item of items) {
      if (!item.itemId || item.price === undefined || item.quantity === undefined) {
        return NextResponse.json({ error: 'Invalid item format' }, { status: 400 });
      }
      
      const parsedPrice = parseFloat(String(item.price));
      const parsedQty = parseInt(String(item.quantity));

      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ error: 'Invalid item price' }, { status: 400 });
      }

      if (isNaN(parsedQty) || parsedQty <= 0) {
        return NextResponse.json({ error: 'Item quantity must be greater than 0' }, { status: 400 });
      }

      // Anti-abuse: limit quantity per item
      if (parsedQty > 10) {
        return NextResponse.json({ error: 'Maximum quantity per item is 10' }, { status: 400 });
      }

      total += parsedPrice * parsedQty;
    }

    total = Math.round(total * 1000) / 1000;

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        table_label: tableLabel,
        status: 'CREATED',
        items: items.map((item: Record<string, unknown>) => ({
          itemId: item.itemId,
          nameFr: item.nameFr || item.name || '',
          nameAr: item.nameAr || '',
          price: parseFloat(String(item.price)),
          quantity: parseInt(String(item.quantity)),
          note: item.note || '',
        })),
        subtotal: total,
        total,
        currency: 'TND',
        customer_note: customerNote || '',
        source: 'PUBLIC_QR',
        language: language || 'FR',
      })
      .select('id')
      .single();

    if (error) throw error;

    await supabase.from('activity_logs').insert({
      restaurant_id: restaurantId,
      order_id: order.id,
      table_id: tableId,
      type: 'ORDER_STATUS_CHANGE',
      actor_id: 'system',
      actor_role: 'owner',
      actor_name: 'Customer QR',
      action: 'ORDER_CREATED',
      to_status: 'CREATED',
    });

    return NextResponse.json({ success: true, orderId: order.id }, { status: 201 });
  } catch (error) {
    console.error('Public orders API error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('status', ['CREATED', 'ACCEPTED', 'PAID'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map DB snake_case columns to camelCase expected by the cashier UI
    const mappedOrders = (orders || []).map(o => ({
      id: o.id,
      restaurantId: o.restaurant_id,
      tableId: o.table_id,
      tableLabel: o.table_label,
      status: o.status,
      items: Array.isArray(o.items) ? o.items.map((item: any) => ({
        itemId: item.itemId || item.id || '',
        name: item.nameFr || item.name || '',
        price: parseFloat(String(item.price || 0)),
        quantity: parseInt(String(item.quantity || 1)),
        note: item.note || '',
      })) : [],
      subtotal: parseFloat(String(o.subtotal || 0)),
      total: parseFloat(String(o.total || 0)),
      currency: o.currency || 'TND',
      createdAt: new Date(o.created_at),
    }));

    return NextResponse.json({ orders: mappedOrders });
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, reason } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Get existing order to inspect current fields and verify ownership if needed
    const { data: existing, error: fetchError } = await supabase
      .from('orders')
      .select('status, restaurant_id, table_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'ACCEPTED') {
      updates.accepted_at = new Date().toISOString();
      updates.accepted_by = 'cashier';
    } else if (status === 'PAID') {
      updates.paid_at = new Date().toISOString();
      updates.paid_by = 'cashier';
    } else if (status === 'CLOSED') {
      updates.closed_at = new Date().toISOString();
      updates.closed_by = 'cashier';
    } else if (status === 'CANCELLED') {
      updates.cancelled_at = new Date().toISOString();
      updates.cancelled_by = 'cashier';
      updates.cancellation_reason = reason || 'Cancelled by staff';
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    // Log the activity to audit log
    await supabase.from('activity_logs').insert({
      restaurant_id: updatedOrder.restaurant_id,
      order_id: updatedOrder.id,
      table_id: updatedOrder.table_id,
      type: 'ORDER_STATUS_CHANGE',
      actor_id: 'cashier',
      actor_role: 'cashier',
      actor_name: 'Cashier Dashboard',
      action: `ORDER_${status}`,
      from_status: existing.status,
      to_status: status,
      reason: reason || null,
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
