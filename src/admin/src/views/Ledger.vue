<template>
  <div>
    <el-form :model="query" inline>
      <el-form-item label="销售方">
        <el-select v-model="query.sellerId" clearable placeholder="请选择">
          <el-option
            v-for="item in sellers"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="请选择">
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="日期范围">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
        <el-button type="success" :loading="exporting" @click="exportExcel">导出 Excel</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="tableData" v-loading="loading">
      <el-table-column prop="orderNo" label="订单号" width="160" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          {{ formatStatus(row.status) }}
        </template>
      </el-table-column>
      <el-table-column label="销售方">
        <template #default="{ row }">
          {{ getSellerName(row.sellerId) }}
        </template>
      </el-table-column>
      <el-table-column label="产品">
        <template #default="{ row }">
          {{ getProductName(row.productId) }}
        </template>
      </el-table-column>
      <el-table-column prop="quantity" label="数量" width="80" />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">
          {{ (row.totalAmount / 100).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column prop="paidAt" label="支付时间" width="160" />
      <el-table-column prop="createdAt" label="创建时间" width="160" />
    </el-table>

    <el-pagination
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @change="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api';

const loading = ref(false);
const exporting = ref(false);
const tableData = ref<any[]>([]);
const sellers = ref<any[]>([]);
const products = ref<any[]>([]);
const total = ref(0);
const dateRange = ref<string[]>([]);

const query = reactive({
  sellerId: '',
  status: '',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 10,
});

const statusOptions = [
  { value: 'pending_payment', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'address_pending', label: '待填地址' },
  { value: 'shipping_pending', label: '待发货' },
  { value: 'shipped', label: '已发货' },
  { value: 'aftersale_waiting', label: '售后观察期' },
  { value: 'settlement_ready', label: '可结算' },
  { value: 'closed', label: '已关闭' },
  { value: 'refunded', label: '已退款' },
  { value: 'cancelled', label: '已取消' },
];

async function loadData() {
  loading.value = true;
  try {
    updateDateRange();
    const { data } = await api.get('/orders', { params: query });
    tableData.value = data.items;
    total.value = data.total;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadSellers() {
  const { data } = await api.get('/sellers', { params: { pageSize: 1000 } });
  sellers.value = data.items;
}

async function loadProducts() {
  const { data } = await api.get('/products', { params: { pageSize: 1000 } });
  products.value = data.items;
}

function updateDateRange() {
  if (dateRange.value && dateRange.value.length === 2) {
    query.startDate = dateRange.value[0];
    query.endDate = dateRange.value[1];
  } else {
    query.startDate = '';
    query.endDate = '';
  }
}

function resetQuery() {
  query.sellerId = '';
  query.status = '';
  query.startDate = '';
  query.endDate = '';
  query.page = 1;
  dateRange.value = [];
  loadData();
}

function formatStatus(status: string) {
  const option = statusOptions.find((item) => item.value === status);
  return option?.label || status;
}

function getSellerName(sellerId: string) {
  const seller = sellers.value.find((s) => s.id === sellerId);
  return seller?.name || '-';
}

function getProductName(productId: string) {
  const product = products.value.find((p) => p.id === productId);
  return product?.name || '-';
}

async function exportExcel() {
  exporting.value = true;
  try {
    updateDateRange();
    const params = {
      sellerId: query.sellerId,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    };
    const res = await api.get('/ledger/export', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledger-${new Date().toISOString().slice(0, 10)}-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    link.remove();
    ElMessage.success('导出成功');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '导出失败');
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  loadData();
  loadSellers();
  loadProducts();
});
</script>
