import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Switch, FormControlLabel, Grid, Chip } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import { useNotificationsStore } from '../store/notifications.store';
import { adminService } from '../services/admin.service';
interface FeatureFlag { id: string; key: string; name?: string; description?: string; isEnabled: boolean; category?: string; }
export const FeatureFlagsPage: React.FC = () => {
 const addToast=useNotificationsStore(s=>s.addToast); const [flags,setFlags]=useState<FeatureFlag[]>([]); const [loading,setLoading]=useState(false);
 const load=async()=>{setLoading(true); try{const data=await adminService.getFeatureFlags(); setFlags(Array.isArray(data)?data:(data?.data||[]));}catch(e:any){addToast('error',e?.response?.data?.message||'Failed to load feature flags');}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 const handleToggle=async(flag:FeatureFlag)=>{try{const updated=await adminService.updateFeatureFlag(flag.id,!flag.isEnabled); setFlags(prev=>prev.map(f=>f.id===flag.id?{...f,...updated}:f)); addToast('success',`${flag.key} ${!flag.isEnabled?'enabled':'disabled'}`);}catch(e:any){addToast('error',e?.response?.data?.message||'Feature flag update failed')}};
 return <Box><Box sx={{mb:3}}><Typography variant="h4" sx={{fontWeight:800}}>Feature Flag Control Console</Typography><Typography variant="body2" color="text.secondary">Backend-persisted platform feature flags. No sample flags are injected by the Admin UI.</Typography></Box>{!loading&&flags.length===0&&<Typography color="text.secondary">No feature flags are configured.</Typography>}<Grid container spacing={2.5}>{flags.map(flag=><Grid size={{xs:12,md:6}} key={flag.id}><Card elevation={0}><CardContent><Box sx={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',mb:1}}><Box sx={{display:'flex',alignItems:'center',gap:1}}><FlagIcon color="primary"/><Typography variant="h6" sx={{fontWeight:700}}>{flag.name||flag.key}</Typography></Box><Chip label={flag.category||'General'} size="small" variant="outlined"/></Box><Typography variant="body2" color="text.secondary" sx={{mb:2}}>{flag.description||'No description provided.'}</Typography><FormControlLabel control={<Switch checked={flag.isEnabled} onChange={()=>void handleToggle(flag)} />} label={flag.isEnabled?'Active (ENABLED)':'Disabled'}/></CardContent></Card></Grid>)}</Grid></Box>;
};
