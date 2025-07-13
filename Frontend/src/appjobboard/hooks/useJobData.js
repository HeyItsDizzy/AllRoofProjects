import { useEffect, useState } from 'react';
import planConfig from '@/appjobboard/data/planConfig.json';
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";


export function useJobData() {
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const months = [...new Set(allJobs.map(j => j.Month).filter(Boolean))];

  useEffect(() => {
    async function fetchJobs() {
      try {
        const axiosSecure = useAxiosSecure();
        const res = await axiosSecure.get('/projects/get-projects');

            //onsole.log("🔥 API raw response:", res.data);
 
const raw = res?.data?.data;

if (!Array.isArray(raw)) {
  console.warn("❌ No project data found. Check API format:", res?.data);
  return;
}

const jobs = raw.map((job) => ({
  ...job,
  Month: parseMonth(
    job.DateReceived || job.Date || job.DateDue || job.createdAt
  ) || 'Unknown',
  Qty: parseInt(job.Qty ?? 0),
  EstQty: parseInt(job.EstQty ?? 0),
  EstInv: parseInt(job.EstInv ?? 0),
}));

        setAllJobs(jobs);
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  return { allJobs, months, loading, dataConfig: planConfig };
}

function parseMonth(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-AU', { month: 'short' });
  } catch {
    return 'Unknown';
  }
}
