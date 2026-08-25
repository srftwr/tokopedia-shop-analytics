/**
 * Tokopedia Shop Analytics - Popup Script
 * Fokus: Analisis untuk penjualan sandal
 */

class TokopediaAnalyzer {
    constructor() {
        this.data = null;
        this.analysis = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAnalysis();
    }

    setupEventListeners() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });
        document.getElementById('analyze-btn').addEventListener('click', () => this.loadAnalysis());
    }

    async loadAnalysis() {
        this.showLoading();
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            chrome.tabs.sendMessage(tab.id, { action: 'getData' }, (response) => {
                if (chrome.runtime.lastError) {
                    this.showError();
                    return;
                }

                if (!response || !response.isValidPage) {
                    this.showError();
                    return;
                }

                this.data = response;
                this.analysis = this.analyzeData(response);
                this.render();
            });
        } catch (error) {
            console.error('Error:', error);
            this.showError();
        }
    }

    analyzeData(data) {
        const metrics = this.parseMetrics(data.metrics);

        const analysis = {
            status: 'normal',
            statusEmoji: '🟡',
            statusColor: '#ffc107',
            summary: 'Data sedang dianalisis...',
            details: {},
            problems: [],
            strategies: []
        };

        if (!metrics || Object.keys(metrics).length === 0) {
            analysis.status = 'unknown';
            analysis.statusEmoji = '❓';
            analysis.summary = 'Tidak bisa membaca data. Buka halaman Data Overview Tokopedia.';
            return analysis;
        }

        // Analisis Tokopedia metrics
        const gmv = metrics.gmv || metrics.penjualan || 0;
        const visitor = metrics.visitor || metrics.pengunjung || 0;
        const conversion = metrics.conversion || metrics.konversi || 0;
        const productViews = metrics.productViews || metrics.views || 0;
        const orders = metrics.orders || 0;

        // Determine status
        if (gmv > 0 && visitor > 0 && conversion > 2) {
            analysis.status = 'good';
            analysis.statusEmoji = '🟢';
            analysis.statusColor = '#28a745';
            analysis.summary = `Toko sedang berkembang baik! Rp ${this.formatNumber(gmv)} penjualan hari ini dengan ${visitor} pengunjung.`;
        } else if (visitor > 0 && gmv === 0) {
            analysis.status = 'problem';
            analysis.statusEmoji = '🔴';
            analysis.statusColor = '#dc3545';
            analysis.summary = 'Banyak pengunjung tapi belum ada penjualan. Ada masalah dengan conversion!';
            analysis.problems.push('Conversion rate 0% - tidak ada yang membeli');
            analysis.problems.push('Kemungkinan: foto sandal kurang menarik, harga tidak kompetitif, atau deskripsi tidak detail');
        } else if (visitor > 0) {
            analysis.status = 'warning';
            analysis.statusEmoji = '🟡';
            analysis.statusColor = '#ffc107';
            analysis.summary = 'Penjualan sandal sedang berkembang tapi belum optimal. Perlu optimasi lebih lanjut.';
        } else {
            analysis.status = 'low';
            analysis.statusEmoji = '📉';
            analysis.statusColor = '#6c757d';
            analysis.summary = 'Traffic toko masih sangat rendah. Perlu push marketing yang lebih kuat.';
            analysis.problems.push('Visibility produk sandal masih rendah');
        }

        // Generate strategies khusus sandal
        analysis.strategies = this.generateSandalStrategies(metrics, analysis.status);
        analysis.details = metrics;

        return analysis;
    }

    generateSandalStrategies(metrics, status) {
        const strategies = [];

        if (status === 'problem') {
            strategies.push('📸 Foto Sandal: Upload foto dari berbagai sudut, terlihat kaki pake sandal Anda');
            strategies.push('💰 Harga Kompetitif: Bandingkan harga dengan seller lain untuk kategori sandal serupa');
            strategies.push('📝 Deskripsi Detail: Tulis deskripsi panjang tentang bahan, ukuran, dan fitur sandal');
            strategies.push('⭐ Rating & Review: Minta pembeli memberi rating 5 bintang untuk boost kredibilitas');
            strategies.push('🚫 JANGAN: Jangan turunkan harga drastis dulu - cek foto & deskripsi dulu!');
        } else if (status === 'warning') {
            strategies.push('📊 A/B Testing: Coba ubah 1 foto sandal untuk lihat impact ke conversion');
            strategies.push('🎯 Target Audience: Fokus ke keywords seperti "sandal casual", "sandal gunung", dll');
            strategies.push('💬 Engage Customers: Reply chat cepat, tawarkan bundle sandal, atau diskon untuk repeat buyer');
            strategies.push('📈 Increase Stock: Tingkatkan stok populer, kurangi yang tidak terjual');
            strategies.push('🔄 Regular Updates: Update foto atau deskripsi seminggu sekali biar produk nambah impression');
        } else if (status === 'low') {
            strategies.push('📢 Flash Sale: Buat flash sale sandal untuk attract pembeli baru');
            strategies.push('🎁 Free Shipping: Offer gratis ongkos kirim untuk pembelian pertama');
            strategies.push('📸 Improve Photos: Foto berkualitas tinggi adalah key untuk sandal - buat foto lifestyle');
            strategies.push('🔑 Keyword Research: Gunakan keyword "sandal murah", "sandal berkualitas" di judul');
            strategies.push('⏰ Timing: Posting produk baru pada jam prime time (pagi, sore, malam)');
        } else if (status === 'good') {
            strategies.push('📦 Scale Up: Pertahankan strategi saat ini, tingkatkan budget untuk expand');
            strategies.push('🆕 New Variants: Tambah variasi sandal baru berdasarkan best seller Anda');
            strategies.push('👥 Cross-Sell: Bundle sandal dengan produk komplementer (kaos kaki, gel alas kaki, etc)');
            strategies.push('⭐ Maintain Quality: Jaga kualitas produk dan service agar rating tetap tinggi');
            strategies.push('📈 Long-term Growth: Fokus pada customer retention dan repeat purchase rate');
        }

        return strategies;
    }

    parseMetrics(metricsObj) {
        const parsed = {};

        Object.entries(metricsObj).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase();
            
            if (lowerKey.includes('gmv') || lowerKey.includes('penjualan') || lowerKey.includes('sales')) {
                parsed.gmv = this.parseNumber(value);
            } else if (lowerKey.includes('pengunjung') || lowerKey.includes('visitor') || lowerKey.includes('visit')) {
                parsed.visitor = this.parseNumber(value);
            } else if (lowerKey.includes('konversi') || lowerKey.includes('conversion')) {
                parsed.conversion = this.parseNumber(value);
            } else if (lowerKey.includes('view') || lowerKey.includes('impression')) {
                parsed.productViews = this.parseNumber(value);
            } else if (lowerKey.includes('order')) {
                parsed.orders = this.parseNumber(value);
            } else if (lowerKey.includes('rating') || lowerKey.includes('score')) {
                parsed.rating = value;
            } else {
                parsed[key] = value;
            }
        });

        return parsed;
    }

    parseNumber(value) {
        if (typeof value === 'number') return value;
        
        const str = String(value).toLowerCase();
        const num = parseFloat(str.replace(/[^\d.,]/g, '').replace(/[.,]/, '.'));
        
        if (str.includes('k')) return num * 1000;
        if (str.includes('m')) return num * 1000000;
        if (str.includes('b')) return num * 1000000000;
        
        return isNaN(num) ? 0 : num;
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Math.floor(num).toString();
    }

    switchMode(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

        document.querySelectorAll('.mode-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(mode).classList.add('active');
    }

    render() {
        const { analysis } = this;

        // Status
        const statusHTML = `
            <div class="status-indicator">${analysis.statusEmoji}</div>
            <strong>${analysis.summary}</strong>
        `;
        document.getElementById('status-text').innerHTML = statusHTML;

        // Overview
        const overviewHTML = Object.entries(analysis.details)
            .map(([key, value]) => `
                <div class="metric-item">
                    <span class="metric-label">${this.formatLabel(key)}</span>
                    <span class="metric-value">${value}</span>
                </div>
            `).join('');
        document.getElementById('overview-content').innerHTML = overviewHTML || '<p>Tidak ada data</p>';

        // Analysis
        const analysisHTML = `
            <p><strong>Status Toko:</strong> ${analysis.status.toUpperCase()}</p>
            <p>${analysis.summary}</p>
            ${analysis.problems.length > 0 ? `
                <h4 style="margin-top: 12px; margin-bottom: 8px; font-size: 12px;">Masalah Terdeteksi:</h4>
                ${analysis.problems.map(p => `<div class="alert danger">${p}</div>`).join('')}
            ` : '<p style="color: #666;">Toko dalam kondisi baik ✓</p>'}
        `;
        document.getElementById('analysis-content').innerHTML = analysisHTML;

        // Problems
        const problemHTML = analysis.problems.length > 0 
            ? analysis.problems.map(p => `<div class="alert danger">${p}</div>`).join('')
            : '<p style="color: #666;">Tidak ada masalah kritis yang terdeteksi ✓</p>';
        document.getElementById('problem-content').innerHTML = problemHTML;

        // Strategies
        const strategyHTML = analysis.strategies
            .map(strategy => `<div class="strategy-item">${strategy}</div>`)
            .join('');
        document.getElementById('strategy-content').innerHTML = strategyHTML;

        this.showResult();
    }

    formatLabel(key) {
        const labels = {
            gmv: '💰 GMV (Penjualan)',
            visitor: '👥 Pengunjung',
            conversion: '🎯 Conversion Rate',
            productViews: '👀 Impression Produk',
            orders: '📦 Jumlah Order',
            rating: '⭐ Rating Toko'
        };
        return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('analysis-result').classList.add('hidden');
        document.getElementById('error-message').classList.add('hidden');
    }

    showResult() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('analysis-result').classList.remove('hidden');
        document.getElementById('error-message').classList.add('hidden');
    }

    showError() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('analysis-result').classList.add('hidden');
        document.getElementById('error-message').classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TokopediaAnalyzer();
});