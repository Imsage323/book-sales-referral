<template>
  <div>
    <el-form :model="query" inline>
      <el-form-item label="关键词">
        <el-input v-model="query.keyword" placeholder="订单号" />
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
      </el-form-item>
    </el-form>

    <el-table :data="tableData" v-loading="loading">
      <el-table-column prop="orderNo" label="订单号" width="160" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          {{ formatStatus(row.status) }}
        </template>
      </el-table-column>
      <el-table-column prop="quantity" label="数量" width="80" />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">
          {{ (row.totalAmount / 100).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column label="销售方">
        <template #default="{ row }">
          {{ getSellerName(row.sellerId) }}
        </template>
      </el-table-column>
      <el-table-column prop="paidAt" label="支付时间" width="160" />
      <el-table-column prop="createdAt" label="创建时间" width="160" />
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button type="primary" text @click="openDetail(row)">详情</el-button>
          <el-button type="primary" text @click="openStatusDialog(row)">改状态</el-button>
          <el-button type="success" text @click="openShipDialog(row)">发货</el-button>
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

    <el-dialog v-model="detailVisible" title="订单详情" width="600px">
      <el-descriptions :column="1" border v-if="currentOrder">
        <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ formatStatus(currentOrder.status) }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ currentOrder.quantity }}</el-descriptions-item>
        <el-descriptions-item label="金额">{{ (currentOrder.totalAmount / 100).toFixed(2) }} 元</el-descriptions-item>
        <el-descriptions-item label="单价">{{ (currentOrder.unitPrice / 100).toFixed(2) }} 元</el-descriptions-item>
        <el-descriptions-item label="OpenID">{{ currentOrder.openid }}</el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ currentOrder.paidAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="微信支付单号">{{ currentOrder.wxTransactionId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ currentOrder.createdAt }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="currentAddress" class="address-section">
        <h4>邮寄地址</h4>
        <p>收件人：{{ currentAddress.recipient }}</p>
        <p>手机号：{{ currentAddress.phone }}</p>
        <p>地址：{{ currentAddress.province }}{{ currentAddress.city }}{{ currentAddress.district }}{{ currentAddress.address }}</p>
        <p v-if="currentAddress.remark">备注：{{ currentAddress.remark }}</p>
      </div>
      <div v-if="currentShipments.length > 0" class="shipment-section">
        <h4>发货记录</h4>
        <el-table :data="currentShipments" size="small">
          <el-table-column prop="company" label="快递公司" />
          <el-table-column prop="trackingNo" label="快递单号" />
          <el-table-column prop="shippedAt" label="发货时间" />
          <el-table-column prop="aftersaleEnd" label="售后期结束" />
        </el-table>
      </div>
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

    <el-dialog v-model="shipVisible" title="发货" width="400px">
      <el-form :model="shipForm" label-width="100px">
        <el-form-item label="快递公司">
          <el-input v-model="shipForm.company" />
        </el-form-item>
        <el-form-item label="快递单号">
          <el-input v-model="shipForm.trackingNo" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipVisible = false">取消</el-button>
        <el-button type="primary" @click="submitShip">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api';

const loading = ref(false);
const tableData = ref<any[]>([]);
const sellers = ref<any[]>([]);
const total = ref(0);

const detailVisible = ref(false);
const statusVisible = ref(false);
const shipVisible = ref(false);

const currentOrder = ref<any>(null);
const currentAddress = ref<any>(null);
const currentShipments = ref<any[]>([]);

const query = reactive({ keyword: '', status: '', sellerId: '', page: 1, pageSize: 10 });
const statusForm = reactive({ status: '', remark: '' });
const shipForm = reactive({ company: '', trackingNo: '' });

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
    const { data } = await api.get('/orders', { params: query });
    tableData.value = data.items;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function loadSellers() {
  const { data } = await api.get('/sellers', { params: { pageSize: 1000 } });
  sellers.value = data.items;
}

function resetQuery() {
  query.keyword = '';
  query.status = '';
  query.sellerId = '';
  query.page = 1;
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

async function openDetail(row: any) {
  currentOrder.value = row;
  try {
    const { data } = await api.get(`/orders/${row.id}`);
    currentOrder.value = data.order;
    currentAddress.value = data.address;
    const shipRes = await api.get('/shipments', { params: { orderId: row.id } });
    currentShipments.value = shipRes.data.items;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载详情失败');
  }
  detailVisible.value = true;
}

function openStatusDialog(row: any) {
  currentOrder.value = row;
  statusForm.status = row.status;
  statusForm.remark = '';
  statusVisible.value = true;
}

async function submitStatus() {
  try {
    await api.patch(`/orders/${currentOrder.value.id}/status`, statusForm);
    ElMessage.success('状态更新成功');
    statusVisible.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '状态更新失败');
  }
}

function openShipDialog(row: any) {
  currentOrder.value = row;
  shipForm.company = '';
  shipForm.trackingNo = '';
  shipVisible.value = true;
}

async function submitShip() {
  try {
    await api.post('/shipments', {
      orderId: currentOrder.value.id,
      company: shipForm.company,
      trackingNo: shipForm.trackingNo,
    });
    ElMessage.success('发货成功');
    shipVisible.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '发货失败');
  }
}

onMounted(() => {
  loadData();
  loadSellers();
});
</script>

<style scoped>
.address-section,
.shipment-section {
  margin-top: 20px;
}
.address-section h4,
.shipment-section h4 {
  margin-bottom: 10px;
}
</style>
