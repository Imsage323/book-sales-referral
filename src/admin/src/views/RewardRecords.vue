<template>
  <div>
    <el-form :model="query" inline>
      <el-form-item label="奖励类型">
        <el-select v-model="query.rewardType" clearable placeholder="请选择">
          <el-option
            v-for="item in rewardTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
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
      <el-form-item>
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
        <el-button type="warning" :loading="running" @click="runSettlement">手动结算</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="tableData" v-loading="loading">
      <el-table-column prop="orderNo" label="订单号" width="160" />
      <el-table-column label="产品">
        <template #default="{ row }">
          {{ getProductName(row.productId) }}
        </template>
      </el-table-column>
      <el-table-column label="销售方">
        <template #default="{ row }">
          {{ getSellerName(row.sellerId) }}
        </template>
      </el-table-column>
      <el-table-column label="受益人">
        <template #default="{ row }">
          {{ getSellerName(row.beneficiaryId) }}
        </template>
      </el-table-column>
      <el-table-column label="奖励类型" width="100">
        <template #default="{ row }">
          {{ formatRewardType(row.rewardType) }}
        </template>
      </el-table-column>
      <el-table-column label="金额" width="100">
        <template #default="{ row }">
          {{ (row.amount / 100).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          {{ formatStatus(row.status) }}
        </template>
      </el-table-column>
      <el-table-column prop="calculatedAt" label="计算时间" width="160" />
      <el-table-column prop="processedAt" label="处理时间" width="160" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button type="primary" text @click="openStatusDialog(row)">改状态</el-button>
          <el-button type="primary" text @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @change="loadData"
    />

    <el-dialog v-model="detailVisible" title="返点详情" width="500px">
      <el-descriptions :column="1" border v-if="currentRecord">
        <el-descriptions-item label="订单号">{{ currentRecord.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="产品">{{ getProductName(currentRecord.productId) }}</el-descriptions-item>
        <el-descriptions-item label="销售方">{{ getSellerName(currentRecord.sellerId) }}</el-descriptions-item>
        <el-descriptions-item label="受益人">{{ getSellerName(currentRecord.beneficiaryId) }}</el-descriptions-item>
        <el-descriptions-item label="奖励类型">{{ formatRewardType(currentRecord.rewardType) }}</el-descriptions-item>
        <el-descriptions-item label="金额">{{ (currentRecord.amount / 100).toFixed(2) }} 元</el-descriptions-item>
        <el-descriptions-item label="状态">{{ formatStatus(currentRecord.status) }}</el-descriptions-item>
        <el-descriptions-item label="计算时间">{{ currentRecord.calculatedAt }}</el-descriptions-item>
        <el-descriptions-item label="处理时间">{{ currentRecord.processedAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="公式">{{ currentRecord.formula }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ currentRecord.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <el-dialog v-model="statusVisible" title="更新状态" width="400px">
      <el-form :model="statusForm" label-width="80px">
        <el-form-item label="状态">
          <el-select v-model="statusForm.status">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="statusForm.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStatus">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api';

const loading = ref(false);
const running = ref(false);
const tableData = ref<any[]>([]);
const sellers = ref<any[]>([]);
const products = ref<any[]>([]);
const total = ref(0);
const detailVisible = ref(false);
const statusVisible = ref(false);
const currentRecord = ref<any>(null);

const query = reactive({
  rewardType: '',
  status: '',
  sellerId: '',
  page: 1,
  pageSize: 10,
});

const statusForm = reactive({
  status: '',
  remark: '',
});

const rewardTypeOptions = [
  { value: 'seller', label: '销售奖励' },
  { value: 'referral', label: '推荐奖励' },
];

const statusOptions = [
  { value: 'estimated', label: '预估' },
  { value: 'ready', label: '可结算' },
  { value: 'pending', label: '待处理' },
  { value: 'processed', label: '已处理' },
  { value: 'reversed', label: '已撤销' },
  { value: 'void', label: '无效' },
];

async function loadData() {
  loading.value = true;
  try {
    const params: {
      page: number;
      pageSize: number;
      rewardType?: string;
      status?: string;
      sellerId?: string;
    } = {
      page: query.page,
      pageSize: query.pageSize,
    };
    if (query.rewardType) params.rewardType = query.rewardType;
    if (query.status) params.status = query.status;
    if (query.sellerId) params.sellerId = query.sellerId;

    const { data } = await api.get('/rewards/records', { params });
    tableData.value = data.items;
    total.value = data.total;
  } catch {
    ElMessage.error('返点记录加载失败，请稍后重试');
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

function resetQuery() {
  query.rewardType = '';
  query.status = '';
  query.sellerId = '';
  query.page = 1;
  loadData();
}

function formatRewardType(type: string) {
  const option = rewardTypeOptions.find((item) => item.value === type);
  return option?.label || type;
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

function openDetail(row: any) {
  currentRecord.value = row;
  detailVisible.value = true;
}

function openStatusDialog(row: any) {
  currentRecord.value = row;
  statusForm.status = row.status;
  statusForm.remark = '';
  statusVisible.value = true;
}

async function submitStatus() {
  try {
    await api.patch(`/rewards/records/${currentRecord.value.id}/status`, statusForm);
    ElMessage.success('状态更新成功');
    statusVisible.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '状态更新失败');
  }
}

async function runSettlement() {
  running.value = true;
  try {
    const { data } = await api.post('/rewards/settlements/run');
    ElMessage.success(`结算完成，本次结算 ${data.settledCount} 个订单`);
    loadData();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '结算失败');
  } finally {
    running.value = false;
  }
}

onMounted(() => {
  loadData();
  loadSellers();
  loadProducts();
});
</script>
