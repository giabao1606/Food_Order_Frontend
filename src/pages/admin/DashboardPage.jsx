import React, { useState, useEffect } from 'react';
import { MdAttachMoney, MdShoppingBag, MdPersonAdd, MdCancel } from "react-icons/md";
import { FaCalendarAlt, FaTrophy, FaFire, FaClock } from "react-icons/fa";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axiosClient from '../../utils/axiosClient';

const COLORS = ['#006a6a', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

const DashboardPage = () => {
  const [overview, setOverview] = useState({ total_revenue: 0, successful_orders: 0, cancelled_orders: 0, new_customers: 0 });
  const [revenueData, setRevenueData] = useState([]);
  const [peakHoursData, setPeakHoursData] = useState([]);
  const [clvData, setClvData] = useState([]);
  const [topItemsData, setTopItemsData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [timeFilter, setTimeFilter] = useState('7'); // days
  const [branchFilter, setBranchFilter] = useState('');

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isManager = currentUser?.role === 'MANAGER';
  const selectedBranch = isManager ? currentUser.branch_id : branchFilter;

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await axiosClient.get('/branches');
        setBranches(res.data?.data || res.data || []);
      } catch (e) { console.error(e); }
    };
    if (!isManager) fetchBranches();
  }, [isManager]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedBranch) params.append('branch_id', selectedBranch);
        
        // Overview dates
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - Number(timeFilter) + 1);
        params.append('startDate', start.toISOString().split('T')[0]);
        params.append('endDate', now.toISOString().split('T')[0]);
        
        // Days
        const chartParams = new URLSearchParams();
        if (selectedBranch) chartParams.append('branch_id', selectedBranch);
        chartParams.append('days', timeFilter);

        const [overviewRes, revRes, peakRes, clvRes, topRes] = await Promise.all([
          axiosClient.get(`/analytics/overview?${params}`, { signal: controller.signal }),
          axiosClient.get(`/analytics/revenue-chart?${chartParams}`, { signal: controller.signal }),
          axiosClient.get(`/analytics/peak-hours?${chartParams}`, { signal: controller.signal }),
          axiosClient.get(`/analytics/customer-clv?${chartParams}`, { signal: controller.signal }),
          axiosClient.get(`/analytics/top-items?${chartParams}`, { signal: controller.signal })
        ]);

        if (overviewRes.success) setOverview(overviewRes.data);
        if (revRes.success) {
            // Format dates
            const formatted = revRes.data.map(d => {
                const dateObj = new Date(d.date);
                return { ...d, dateFormatted: `${dateObj.getDate()}/${dateObj.getMonth() + 1}`, revenue: Number(d.revenue) };
            });
            setRevenueData(formatted);
        }
        if (peakRes.success) setPeakHoursData(peakRes.data.map(d => ({ ...d, hourStr: `${d.hour}:00`, orders: Number(d.total_orders) })));
        if (clvRes.success) setClvData(clvRes.data);
        if (topRes.success) setTopItemsData(topRes.data.map(d => ({ name: d.name, quantity: Number(d.total_quantity) })));

      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
          console.error('Lỗi lấy dữ liệu thống kê:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
    return () => controller.abort();
  }, [timeFilter, selectedBranch]);

  const StatCard = ({ title, value, icon, bgColor, textColor, prefix = '' }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 ${bgColor} rounded-bl-full -z-10 group-hover:scale-110 transition-transform`}></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className="text-gray-500 font-medium mb-1 text-sm">{title}</p>
          <h3 className="text-2xl font-black text-gray-800 tracking-tight">{prefix}{value}</h3>
        </div>
        <div className={`p-3 ${bgColor} ${textColor} rounded-xl`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300 p-4 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 mb-1 tracking-tight">
            Dashboard Phân Tích
          </h1>
          <p className="text-gray-500 text-sm font-medium">Trung tâm dữ liệu (Business Intelligence)</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {!isManager && (
            <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden px-2">
               <select 
                  value={branchFilter} 
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="text-sm font-bold text-gray-700 px-3 py-2 outline-none cursor-pointer bg-transparent"
               >
                  <option value="">Tất cả Chi nhánh</option>
                  {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
               </select>
            </div>
          )}
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden px-2 hover:border-[#006a6a] transition-colors">
             <FaCalendarAlt className="text-[#006a6a] ml-2" />
             <select 
                value={timeFilter} 
                onChange={(e) => setTimeFilter(e.target.value)}
                className="text-sm font-bold text-gray-700 px-3 py-2 outline-none cursor-pointer bg-transparent"
             >
                <option value="1">Hôm nay</option>
                <option value="7">7 ngày qua</option>
                <option value="30">30 ngày qua</option>
             </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#006a6a] rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* TỔNG QUAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Tổng Doanh Thu" value={overview.total_revenue.toLocaleString('vi-VN')} prefix="₫" icon={<MdAttachMoney size={24} />} bgColor="bg-green-50" textColor="text-green-600" />
            <StatCard title="Đơn Thành Công" value={overview.successful_orders} icon={<MdShoppingBag size={24} />} bgColor="bg-blue-50" textColor="text-blue-600" />
            <StatCard title="Khách Hàng Mới" value={overview.new_customers} icon={<MdPersonAdd size={24} />} bgColor="bg-purple-50" textColor="text-purple-600" />
            <StatCard title="Đơn Hủy" value={overview.cancelled_orders} icon={<MdCancel size={24} />} bgColor="bg-red-50" textColor="text-red-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* BIỂU ĐỒ DOANH THU */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><FaFire className="text-orange-500"/> Biểu đồ Doanh Thu</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="dateFormatted" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                    <YAxis tickFormatter={(val) => `₫${(val/1000000).toFixed(1)}`} axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                    <Tooltip formatter={(value) => [`${value.toLocaleString('vi-VN')} ₫`, 'Doanh thu']} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                    <Line type="monotone" dataKey="revenue" stroke="#006a6a" strokeWidth={4} dot={{fill: '#006a6a', strokeWidth: 2, r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* MÓN BÁN CHẠY (PIE CHART) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><FaTrophy className="text-yellow-500"/> Tỷ trọng Món bán chạy</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={topItemsData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="quantity">
                      {topItemsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} phần`, name]} contentStyle={{borderRadius: '12px'}}/>
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '12px'}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* PEAK HOURS */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><FaClock className="text-blue-500"/> Giờ cao điểm (Peak Hours)</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHoursData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="hourStr" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '12px'}} formatter={(val) => [`${val} đơn`, 'Số lượng']}/>
                    <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LEADERBOARD */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><FaTrophy className="text-yellow-500"/> Top Khách Hàng (CLV)</h2>
              <div className="overflow-auto max-h-72 pr-2">
                  {clvData.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center mt-10">Chưa có dữ liệu khách hàng.</p>
                  ) : (
                      <div className="space-y-4">
                          {clvData.map((user, idx) => (
                              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : idx === 1 ? 'bg-gray-200 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                          #{idx + 1}
                                      </div>
                                      <div>
                                          <p className="font-bold text-gray-800 text-sm">{user.name}</p>
                                          <p className="text-xs text-gray-500">{user.phone}</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-bold text-[#006a6a] text-sm">{Number(user.total_spent).toLocaleString('vi-VN')} ₫</p>
                                      <p className="text-xs text-gray-500">{user.total_orders} đơn</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;