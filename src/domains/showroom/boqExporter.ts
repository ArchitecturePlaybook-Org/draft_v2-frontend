import { WishlistItem } from "@/store/wishlist-store";

function parsePrice(p: any): number {
  if (typeof p.price === 'number') return p.price;
  if (typeof p.price_min === 'number') return p.price_min;
  if (p.price_min) return parseFloat(p.price_min) || 0;
  if (p.price_display) {
    const num = parseFloat(p.price_display.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function exportBoQToCSV(items: WishlistItem[], projectName: string = "Showroom Spec BoQ") {
  if (items.length === 0) {
    alert("No items in wishlist to export.");
    return;
  }

  const headers = ["S.No", "SKU Code", "Product Title", "Category", "Vendor Hub", "Unit Price (INR)", "Quantity", "Total Price (INR)", "Origin Location"];
  
  const rows = items.map((item, idx) => {
    const p = item.product;
    const price = parsePrice(p);
    const qty = item.quantity || 1;
    const total = price * qty;
    const title = p.name || (p as any).title || "Architectural Product";
    const vendor = p.vendor_name || (p as any).professional_name || "Verified Bangalore Hub";
    const location = p.country_of_origin || (p as any).location || "Bangalore, India";

    return [
      idx + 1,
      `SKU-${p.id}`,
      `"${title.replace(/"/g, '""')}"`,
      `"${p.category || 'Architectural Fixtures'}"`,
      `"${vendor.replace(/"/g, '""')}"`,
      price.toLocaleString('en-IN'),
      qty,
      total.toLocaleString('en-IN'),
      `"${location.replace(/"/g, '""')}"`
    ];
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportBoQToPDF(items: WishlistItem[], projectName: string = "Architectural Spec Sheet & BoQ") {
  if (items.length === 0) {
    alert("No items in wishlist to export.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to generate PDF Spec Sheet.");
    return;
  }

  const grandTotal = items.reduce((sum, item) => {
    const price = parsePrice(item.product);
    return sum + price * (item.quantity || 1);
  }, 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${projectName} - Architectural Spec Sheet</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 40px; margin: 0; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; color: #0f172a; }
          .logo span { color: #d97706; }
          .meta { text-align: right; font-size: 12px; color: #64748b; font-weight: 600; }
          h1 { font-size: 20px; font-weight: 800; margin: 0 0 5px 0; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; color: #475569; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e2e8f0; }
          td { padding: 14px 16px; font-size: 12px; font-weight: 600; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
          .img-cell img { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; }
          .total-box { margin-top: 30px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: right; }
          .total-box .amount { font-size: 22px; font-weight: 900; color: #0f172a; }
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Architecture<span>Playbook</span></div>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 700;">Verified Trade Showroom BoQ</p>
          </div>
          <div class="meta">
            <p style="margin: 0"><strong>Project:</strong> ${projectName}</p>
            <p style="margin: 3px 0 0 0"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            <p style="margin: 3px 0 0 0"><strong>Location:</strong> Bangalore, India</p>
          </div>
        </div>

        <h1>Architectural Bill of Quantities (BoQ)</h1>
        <p style="font-size: 12px; color: #64748b; margin: 0 0 20px 0;">Official line-item trade quote &amp; specification sheet.</p>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Preview</th>
              <th>Product / Spec</th>
              <th>Vendor Hub</th>
              <th>Unit Price (INR)</th>
              <th>Qty</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => {
              const p = item.product;
              const price = parsePrice(p);
              const qty = item.quantity || 1;
              const subtotal = price * qty;
              const title = p.name || (p as any).title || "Product";
              const vendor = p.vendor_name || (p as any).professional_name || "Studio Nordic";
              const location = p.country_of_origin || (p as any).location || "Bangalore";
              const imageSrc = p.cover_image_url || (p.images && p.images.length > 0 ? p.images[0].image_url : '/placeholder.jpg');

              return `
                <tr>
                  <td style="color:#94a3b8;">#${i + 1}</td>
                  <td class="img-cell"><img src="${imageSrc}" alt="${title}" /></td>
                  <td>
                    <strong style="color:#0f172a; font-size: 13px;">${title}</strong><br/>
                    <span style="font-size: 10px; color: #64748b;">SKU-${p.id} • ${p.category || 'Fixtures'}</span>
                  </td>
                  <td>${vendor}<br/><span style="font-size:10px; color:#94a3b8;">${location}</span></td>
                  <td>₹${price.toLocaleString('en-IN')}</td>
                  <td>${qty}</td>
                  <td style="text-align:right; font-weight: 800; color:#0f172a;">₹${subtotal.toLocaleString('en-IN')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="total-box">
          <span style="font-size:12px; color:#64748b; font-weight:700; text-transform:uppercase;">Estimated Project BoQ Total</span>
          <div class="amount">₹${grandTotal.toLocaleString('en-IN')}</div>
          <span style="font-size:10px; color:#94a3b8;">* Inclusive of all taxes and verified trade origin delivery in Bangalore.</span>
        </div>

        <div class="footer">
          Generated automatically via ArchitecturePlaybook Trade Showroom • All Rights Reserved.
        </div>

        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
