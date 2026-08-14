import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { adminService } from '../services/admin.service';
import { giftsAdminService, GiftRevenueSummary } from '../services/gifts.service';

export const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<GiftRevenueSummary | null>(null);
  useEffect(() => {
    Promise.all([
      adminService.getDashboardStats().catch(() => null),
      giftsAdminService.getRevenue('weekly').catch(() => null),
    ]).then(([dashboard, giftRevenue]) => { setStats(dashboard); setRevenue(giftRevenue); });
  }, []);
  const cards = [
    ['Registered Users', stats?.totalUsers ?? 0],
    ['Total Rooms', stats?.totalRooms ?? 0],
    ['Live Rooms', stats?.liveRooms ?? 0],
    ['Verified Hosts', stats?.totalHosts ?? 0],
    ['Wallet Transactions', stats?.totalWalletTransactions ?? stats?.totalWalletTx ?? 0],
    ['Gift Transactions (weekly)', revenue?.totalTransactions ?? 0],
    ['Gift Coin Volume (weekly)', revenue?.totalCoinsVolume ?? 0],
    ['Platform Gift Revenue (weekly)', revenue?.platformNetRevenue ?? 0],
  ];
  return <Box><Box sx={{mb:3}}><Typography variant="h4" fontWeight={800}>Platform Analytics & Intelligence</Typography><Typography color="text.secondary">Current persisted platform and monetization metrics. Historical charts are shown only when a real time-series source is available.</Typography></Box><Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(2,1fr)',lg:'repeat(4,1fr)'},gap:2}}>{cards.map(([label,value])=><Card key={String(label)}><CardContent><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h4" fontWeight={800}>{Number(value).toLocaleString()}</Typography></CardContent></Card>)}</Box></Box>;
};
