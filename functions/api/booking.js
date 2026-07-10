import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
    const { request, env } = context;

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const formData = await request.formData();

        const nama_pria = formData.get('nama_pria');
        const nama_wanita = formData.get('nama_wanita');
        const ayah_pria = formData.get('ayah_pria');
        const ibu_pria = formData.get('ibu_pria');
        const ayah_wanita = formData.get('ayah_wanita');
        const ibu_wanita = formData.get('ibu_wanita');
        const tanggal_acara = formData.get('tanggal_acara');
        const waktu_acara = formData.get('waktu_acara');
        const lokasi_acara = formData.get('lokasi_acara');
        const maps_link = formData.get('maps_link');
        const no_rekening = formData.get('no_rekening');
        const pemilik_rekening = formData.get('pemilik_rekening');
        const tema_undangan = formData.get('tema_undangan') || 'modern';

        if (!nama_pria || !nama_wanita) {
            return new Response(JSON.stringify({ success: false, message: 'Nama mempelai pria dan wanita wajib diisi.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const cleanPria = nama_pria.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanWanita = nama_wanita.toLowerCase().replace(/[^a-z0-9]/g, '');
        const slug = `${cleanPria}-dan-${cleanWanita}-${Math.floor(1000 + Math.random() * 9000)}`;

        const fileFoto = formData.get('foto_prewedding');
        let fotoPublicUrl = null;

        if (fileFoto && typeof fileFoto === 'object' && fileFoto.size > 0 && typeof fileFoto.arrayBuffer === 'function') {
            const fileExt = fileFoto.name ? fileFoto.name.split('.').pop() : 'jpg';
            const fileName = `${slug}-${Date.now()}.${fileExt}`;
            const filePath = `prewedding/${fileName}`;

            const fileBuffer = await fileFoto.arrayBuffer();

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('undangan-bucket')
                .upload(filePath, fileBuffer, {
                    contentType: fileFoto.type || 'image/jpeg',
                    upsert: true
                });

            if (uploadError) {
                console.error('Gagal upload ke Supabase Storage:', uploadError);
                throw new Error(`Gagal mengunggah foto prewedding: ${uploadError.message}`);
            }

            const { data: publicUrlData } = supabase.storage
                .from('undangan-bucket')
                .getPublicUrl(filePath);

            fotoPublicUrl = publicUrlData.publicUrl;
        }

        const { data, error } = await supabase
            .from('pesanan_undangan')
            .insert([
                {
                    slug: slug,
                    nama_pria: nama_pria,
                    nama_wanita: nama_wanita,
                    ayah_pria: ayah_pria,
                    ibu_pria: ibu_pria,
                    ayah_wanita: ayah_wanita,
                    ibu_wanita: ibu_wanita,
                    tanggal_acara: tanggal_acara,
                    waktu_acara: waktu_acara,
                    lokasi_acara: lokasi_acara,
                    maps_link: maps_link,
                    foto_prewedding: fotoPublicUrl,
                    no_rekening: no_rekening,
                    tema_undangan: tema_undangan,
                    pemilik_rekening: pemilik_rekening
                }
            ])
            .select();

        if (error) throw error;

        return new Response(JSON.stringify({
            success: true,
            message: 'Undangan berhasil dipesan!',
            slug: slug,
            tema: tema_undangan,
            data: data[0]
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error internal server:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message || 'Terjadi kesalahan internal pada server.' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}