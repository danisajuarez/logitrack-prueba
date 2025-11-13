import { NextRequest, NextResponse } from 'next/server';
import { enviarEmailPrueba } from '@/lib/email';

/**
 * Endpoint de prueba para verificar que el envío de emails via SMTP funciona correctamente
 *
 * Usage: GET /api/test-smtp?to=email@ejemplo.com
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const to = searchParams.get('to');

    if (!to) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro "to" con el email de destino' },
        { status: 400 }
      );
    }

    // Validar formato de email básico
    if (!to.includes('@')) {
      return NextResponse.json(
        { error: 'El email proporcionado no parece válido' },
        { status: 400 }
      );
    }

    console.log(`[TEST-SMTP] Enviando email de prueba a: ${to}`);

    const result = await enviarEmailPrueba(to);

    return NextResponse.json({
      success: true,
      message: 'Email de prueba enviado exitosamente via SMTP',
      messageId: result.messageId,
      to,
    });
  } catch (error: any) {
    console.error('[TEST-SMTP] Error:', error);

    return NextResponse.json(
      {
        error: 'Error al enviar email de prueba',
        details: error?.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
