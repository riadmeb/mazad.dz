document.addEventListener('DOMContentLoaded', () => {
  fetch('/auction-winners')
    .then(response => response.json())
    .then(data => {
      console.log('بيانات الفائزين من السيرفر:', data);

      if (!data.success) {
        console.error('❌ خطأ من السيرفر:', data.error);
        return;
      }

      const container = document.getElementById('winnersContainer');
      if (!container) {
        console.error('❌ لم يتم العثور على العنصر الحاوي "winnersContainer" في الصفحة');
        return;
      }

      container.innerHTML = '';

      if (!Array.isArray(data.data) || data.data.length === 0) {
        container.innerText = 'لا توجد مزادات لعرضها.';
        return;
      }

      data.data.forEach((auction, index) => {
        console.log(`مزاد رقم ${index + 1}:`, auction.auction_name);
        console.log('بيانات الفائزين:', auction.winners);

        const card = document.createElement('div');
        card.className = 'auction-card';

        const auctionInfo = `
          <h3>${auction.auction_name || '---'}</h3>
          <p><strong>النوع:</strong> ${auction.auction_type || '---'}</p>
          <p><strong>الولاية:</strong> ${auction.state || '---'}</p>
          <p><strong>البلدية:</strong> ${auction.city || '---'}</p>
          <p><strong>وقت البدء:</strong> ${auction.start_time ? new Date(auction.start_time).toLocaleString() : '---'}</p>
          <p><strong>وقت الانتهاء:</strong> ${auction.end_time ? new Date(auction.end_time).toLocaleString() : '---'}</p>
          <p><strong>رقم المزاد:</strong> ${auction.auction_id || '---'}</p>
          <p><strong>آخر سعر:</strong> ${auction.last_bid_amount != null ? auction.last_bid_amount + ' دج' : '---'}</p>
        `;

        const winners = Array.isArray(auction.winners) ? auction.winners : [];
        console.log('نوع winners:', typeof winners, ', هل مصفوفة؟', Array.isArray(winners));

        // إيجاد الفائز الأول حسب الترتيب (ranking = 1) أو أول فائز في المصفوفة
        const firstWinner = winners.find(w => Number(w.ranking) === 1) || winners[0] || null;

        function formatWinner(winner, rank) {
          if (!winner || !winner.first_name) {
            console.warn(`الفائز ${rank} غير موجود أو بياناته ناقصة في المزاد: ${auction.auction_name}`);
            return `<p>لا يوجد فائز ${rank}.</p>`;
          }
          return `
            <p>${winner.first_name} ${winner.last_name || ''} (${winner.username || '---'})</p>
            <p>📧 ${winner.email || '---'}</p>
            <p>📞 ${winner.phone || '---'}</p>
          `;
        }

        const winnerInfo = `
          <h4>🏆 الفائز الأول</h4>
          ${formatWinner(firstWinner, 'الأول')}
        `;

        card.innerHTML = `
          <div class="auction-details">
            ${auctionInfo}
            <hr />
            ${winnerInfo}
          </div>
        `;

        container.appendChild(card);
      });
    })
    .catch(error => {
      console.error('❌ خطأ أثناء جلب بيانات الفائزين:', error);
      const container = document.getElementById('winnersContainer');
      if (container) container.innerText = 'حدث خطأ أثناء جلب البيانات.';
    });
});
