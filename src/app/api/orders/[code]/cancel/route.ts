
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ code: string }> }
) {
    try {
        const params = await props.params;
        const { code } = params;

        // 1. Get Order
        const order = await prisma.order.findUnique({
            where: { invoiceCode: code },
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // 2. Validate Status & Method
        if (order.status !== "PENDING") {
            return NextResponse.json(
                { error: "Only PENDING orders can be canceled" },
                { status: 400 }
            );
        }

        // 3. Cancel Order
        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: { status: "CANCELED" },
        });

        return NextResponse.json({
            success: true,
            status: updatedOrder.status,
            message: "Order successfully canceled",
        });
    } catch (error: any) {
        console.error("[CANCEL_ORDER_ERROR]", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
