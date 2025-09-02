'use client';

import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';
import React from 'react';

export default function PieActions({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer>
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label>
          {data.map((_, i) => <Cell key={i} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
