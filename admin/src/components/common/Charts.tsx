import React from 'react';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AreaChartProps {
  title: string;
  data: any[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
  height?: number;
}

const ChartHeading: React.FC<{ title: string }> = ({ title }) => (
  <Typography variant="subtitle1" sx={{ mb: 1.75 }}>{title}</Typography>
);

export const AnalyticsAreaChart: React.FC<AreaChartProps> = ({
  title,
  data,
  dataKey,
  xAxisKey,
  color,
  height = 290,
}) => {
  const theme = useTheme();
  const seriesColor = color || theme.palette.primary.main;
  const axisColor = theme.palette.text.secondary;
  const gridColor = theme.palette.divider;

  return (
    <Card elevation={0} sx={{ height: '100%' }}>
      <CardContent>
        <ChartHeading title={title} />
        <Box sx={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={seriesColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={seriesColor} stopOpacity={0.015} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke={gridColor} />
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  boxShadow: theme.palette.mode === 'dark' ? '0 10px 28px rgba(0,0,0,0.32)' : '0 10px 28px rgba(16,35,63,0.11)',
                  border: `1px solid ${gridColor}`,
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey={dataKey} stroke={seriesColor} strokeWidth={2.25} fillOpacity={1} fill={`url(#color-${dataKey})`} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

interface BarChartProps {
  title: string;
  data: any[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
  height?: number;
}

export const AnalyticsBarChart: React.FC<BarChartProps> = ({
  title,
  data,
  dataKey,
  xAxisKey,
  color,
  height = 290,
}) => {
  const theme = useTheme();
  const seriesColor = color || theme.palette.secondary.main;
  const axisColor = theme.palette.text.secondary;
  const gridColor = theme.palette.divider;

  return (
    <Card elevation={0} sx={{ height: '100%' }}>
      <CardContent>
        <ChartHeading title={title} />
        <Box sx={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke={gridColor} />
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  boxShadow: theme.palette.mode === 'dark' ? '0 10px 28px rgba(0,0,0,0.32)' : '0 10px 28px rgba(16,35,63,0.11)',
                  border: `1px solid ${gridColor}`,
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  fontSize: 12,
                }}
              />
              <Bar dataKey={dataKey} fill={seriesColor} radius={[6, 6, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

interface PieChartProps {
  title: string;
  data: { name: string; value: number }[];
  height?: number;
}

export const AnalyticsPieChart: React.FC<PieChartProps> = ({ title, data, height = 290 }) => {
  const theme = useTheme();
  const pieColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.warning.main,
  ];

  return (
    <Card elevation={0} sx={{ height: '100%' }}>
      <CardContent>
        <ChartHeading title={title} />
        <Box sx={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={3} dataKey="value">
                {data.map((item, index) => (
                  <Cell key={`${item.name}-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
