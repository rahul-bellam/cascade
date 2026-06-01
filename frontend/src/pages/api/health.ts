import type { NextApiRequest, NextApiResponse } from 'next';

type HealthData = {
  status: string;
  version: string;
  uptime: number;
  services: {
    frontend: string;
    api: string;
  };
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthData>
) {
  res.status(200).json({
    status: 'ok',
    version: '0.1.0',
    uptime: process.uptime(),
    services: {
      frontend: 'operational',
      api: 'not_connected',
    },
  });
}