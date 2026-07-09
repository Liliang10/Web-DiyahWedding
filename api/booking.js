import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method tidak diizinkan. Gunakan POST.' });
    }

    const form = formidable({ extremes: true });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Error parsing form:', err);
            return res.status(500).json({ success: false, message: 'Gagal memproses data form.' });
        }

        try {
            const nama_pria = fields.nama_pria?.[0] || fields.nama_pria;
            const nama_wanita = fields.nama_wanita?.[0] || fields.nama_wanita;
            const ayah_pria = fields.ayah_pria?.[0] || fields.ayah_pria;
            const ibu_pria = fields.ibu_pria?.[0] || fields.ibu_pria;
            const ayah_wanita = fields.ayah_wanita?.[0] || fields.ayah_wanita;
            const ibu_wanita = fields.ibu_wanita?.[0] || fields.ibu_wanita;
            const tanggal_acara = fields.tanggal_acara?.[0] || fields.tanggal_acara;
            const waktu_acara = fields.waktu_acara?.[0] || fields.waktu_acara;
            const lokasi_acara = fields.lokasi_acara?.[0] || fields.lokasi_acara;
            const maps_link = fields.maps_link?.[0] || fields.maps_link;
            const no_rekening = fields.no_rekening?.[0] || fields.no_rekening || null;
            const tema_undangan = fields.tema_undangan?.[0] || fields.tema_undangan;
            const pemilik_rekening = fields.pemilik_rekening?.[0] || fields.pemilik_rekening;

            const slug = `${nama_pria}-${nama_wanita}`
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-');

            let fotoPublicUrl = null;

            const fotoFile = files.foto_prewedding?.[0] || files.foto_prewedding;
            if (fotoFile && fotoFile.filepath) {
                const fileBuffer = fs.readFileSync(fotoFile.filepath);
                
                const fileExt = fotoFile.originalFilename.split('.').pop();
                const fileName = `${Date.now()}-${slug}.${fileExt}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('foto-prewedding')
                    .upload(fileName, fileBuffer, {
                        contentType: fotoFile.mimetype,
                        upsert: true
                    });

                if (uploadError) {
                    throw new Error('Gagal mengunggah foto ke Supabase Storage: ' + uploadError.message);
                }

                const { data: publicUrlData } = supabase.storage
                    .from('foto-prewedding')
                    .getPublicUrl(fileName);

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

            return res.status(200).json({ 
                success: true, 
                message: 'Undangan berhasil dipesan!',
                slug: slug,
                tema: tema_undangan,
                data: data[0]
            });

        } catch (error) {
            console.error('Error saat menyimpan:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    });
}