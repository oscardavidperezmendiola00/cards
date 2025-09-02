'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';
import React from 'react';

type Row = Record<string, number | string>;

export default function StackedBars({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="view"         stackId="a" name="Vistas" />
        <Bar dataKey="btn:whatsapp" stackId="a" name="WhatsApp" />
        <Bar dataKey="btn:email"    stackId="a" name="Email" />
        <Bar dataKey="btn:phone"    stackId="a" name="Llamar" />
        <Bar dataKey="btn:site"     stackId="a" name="Sitio Web" />
      </BarChart>
    </ResponsiveContainer>
  );
}
