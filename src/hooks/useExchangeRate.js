import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useExchangeRate() {
  const [rate, setRate] = useState(null);
  const [rateRecord, setRateRecord] = useState(null);

  const fetchRate = async () => {
    const records = await base44.entities.ExchangeRate.filter({ currency_pair: 'USD_ETB' });
    if (records.length > 0) {
      setRate(records[0].rate);
      setRateRecord(records[0]);
    }
  };

  useEffect(() => {
    fetchRate();
    const unsub = base44.entities.ExchangeRate.subscribe(() => fetchRate());
    return unsub;
  }, []);

  const toETB = (usd) => rate ? Math.round(usd * rate) : null;
  const toUSD = (etb) => rate ? Math.round((etb / rate) * 100) / 100 : null;

  return { rate, rateRecord, toETB, toUSD, refetch: fetchRate };
}