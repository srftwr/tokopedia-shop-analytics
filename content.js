/**
 * Tokopedia Content Script - Membaca data dari dashboard
 */

function extractDashboardData() {
    try {
        const data = {
            isValidPage: false,
            pageType: 'unknown',
            metrics: {},
            timestamp: new Date().toISOString()
        };

        // Deteksi halaman data overview Tokopedia
        const pageTitle = document.querySelector('[data-testid="page-title"]') || 
                         document.querySelector('h1');
        
        if (pageTitle && pageTitle.textContent.includes('Data')) {
            data.isValidPage = true;
            data.pageType = 'overview';
        }

        // Alternative: cek URL
        if (window.location.href.includes('data-overview')) {
            data.isValidPage = true;
            data.pageType = 'overview';
        }

        // Cek teks halaman
        if (!data.isValidPage) {
            const pageText = document.body.innerText;
            if (pageText.includes('GMV') || pageText.includes('Pengunjung') || pageText.includes('Penjualan')) {
                data.isValidPage = true;
                data.pageType = 'overview';
            }
        }

        if (!data.isValidPage) {
            return data;
        }

        // Extract metrics dari berbagai selector Tokopedia
        const metricElements = document.querySelectorAll(
            '[data-testid*="metric"], [class*="metric"], [class*="card"], [class*="statistic"]'
        );
        
        metricElements.forEach(el => {
            const label = el.getAttribute('data-label') || el.querySelector('[class*="label"]')?.textContent || '';
            const value = el.getAttribute('data-value') || el.querySelector('[class*="value"]')?.textContent || 
                         el.textContent?.match(/[0-9.,]+/)?.[0] || '';
            
            if (label && value) {
                data.metrics[label.trim()] = value.trim();
            }
        });

        // Cari dengan regex pattern
        const allText = document.body.innerText;
        const patterns = {
            gmv: /GMV[:\\s]+Rp([\\d.,]+[kmb]?)/gi,
            visitor: /Pengunjung[:\\s]+(\\d+(?:[.,]\\d+)?[kmb%]*)/gi,
            conversion: /Konversi[:\\s]+(\\d+(?:[.,]\\d+)?[kmb%]*)/gi,
            productViews: /Impression[:\\s]+(\\d+(?:[.,]\\d+)?[kmb%]*)/gi,
            orders: /Order[:\\s]+(\\d+(?:[.,]\\d+)?[kmb%]*)/gi,
        };

        Object.entries(patterns).forEach(([key, pattern]) => {
            const match = allText.match(pattern);
            if (match) {
                const fullMatch = match[0];
                const value = fullMatch.split(/[:\\s]+/).pop();
                data.metrics[key] = value;
            }
        });

        // Jika masih tidak ada metrik, ambil angka dengan konteks
        if (Object.keys(data.metrics).length === 0) {
            const numbers = allText.match(/\\d+(?:[.,]\\d+)?[kmb%]*/g) || [];
            numbers.slice(0, 10).forEach((num, idx) => {
                data.metrics[`value_${idx}`] = num;
            });
        }

        return data;
    } catch (error) {
        console.error('Error extracting data:', error);
        return {
            isValidPage: false,
            error: error.message
        };
    }
}

// Listen untuk pesan dari popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getData') {
        const data = extractDashboardData();
        sendResponse(data);
    }
});

// Kirim data ke background saat halaman load
window.addEventListener('load', () => {
    const data = extractDashboardData();
    chrome.runtime.sendMessage({
        action: 'dataExtracted',
        data: data
    }).catch(() => {
        // Silent - popup mungkin belum terbuka
    });
});