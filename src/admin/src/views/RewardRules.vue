<template>
  <div>
    <el-form :model="query" inline>
      <el-form-item label="规则类型">
        <el-select v-model="query.ruleType" clearable placeholder="请选择">
          <el-option
            v-for="item in ruleTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
        <el-button type="success" @click="openDialog()">新增规则</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="tableData" v-loading="loading">
      <el-table-column label="产品">
        <template #default="{ row }">
          {{ getProductName(row.productId) || '全部' }}
        </template>
      </el-table-column>
      <el-table-column label="销售方">
        <template #default="{ row }">
          {{ getSellerName(row.sellerId) || '全部' }}
        </template>
      </el-table-column>
      <el-table-column label="规则类型" width="120">
        <template #default="{ row }">
          {{ formatRuleType(row.ruleType) }}
        </template>
      </el-table-column>
      <el-table-column label="固定金额" width="100">
        <template #default="{ row }">
          {{ row.fixedAmount ? (row.fixedAmount / 100).toFixed(2) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="比例" width="100">
        <template #default="{ row }">
          {{ row.rate ? `${row.rate}‱` : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="threshold" label="阶梯门槛" width="100" />
      <el-table-column label="默认" width="80">
        <template #default="{ row }">
          {{ row.isDefault ? '是' : '否' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button type="primary" text @click="openDialog(row)">编辑</el-button>
          <el-button type="danger" text @click="remove(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑规则' : '新增规则'" width="500px">
      <el-form :model="form" label-width="120px">
        <el-form-item label="产品">
          <el-select v-model="form.productId" clearable placeholder="全部产品">
            <el-option
              v-for="item in products"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="销售方">
          <el-select v-model="form.sellerId" clearable placeholder="全部销售方">
            <el-option
              v-for="item in sellers"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="规则类型">
          <el-select v-model="form.ruleType">
            <el-option
              v-for="item in ruleTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="固定金额（元）">
          <el-input-number v-model="form.fixedAmountYuan" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="比例（‱）">
          <el-input-number v-model="form.rate" :min="0" :precision="0" />
        </el-form-item>
        <el-form-item label="阶梯门槛">
          <el-input-number v-model="form.threshold" :min="0" />
        </el-form-item>
        <el-form-item label="基础值">
          <el-input-number v-model="form.baseValue" :min="0" />
        </el-form-item>
        <el-form-item label="默认规则">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const tableData = ref<any[]>([]);
const sellers = ref<any[]>([]);
const products = ref<any[]>([]);
const total = ref(0);

const query = reactive({
  ruleType: '',
  page: 1,
  pageSize: 10,
});

const form = reactive<any>({});

const ruleTypeOptions = [
  { value: 'fixed_per_book', label: '每本固定金额' },
  { value: 'percentage', label: '比例提成' },
  { value: 'tier', label: '阶梯奖励' },
];

async function loadData() {
  loading.value = true;
  try {
    const params: {
      page: number;
      pageSize: number;
      ruleType?: string;
    } = {
      page: query.page,
      pageSize: query.pageSize,
    };
    if (query.ruleType) params.ruleType = query.ruleType;

    const { data } = await api.get('/rewards/rules', { params });
    tableData.value = data.items;
    total.value = data.total;
  } catch {
    ElMessage.error('返点规则加载失败，请稍后重试');
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
  query.ruleType = '';
  query.page = 1;
  loadData();
}

function formatRuleType(ruleType: string) {
  const option = ruleTypeOptions.find((item) => item.value === ruleType);
  return option?.label || ruleType;
}

function getSellerName(sellerId?: string) {
  if (!sellerId) return '';
  const seller = sellers.value.find((s) => s.id === sellerId);
  return seller?.name || '-';
}

function getProductName(productId?: string) {
  if (!productId) return '';
  const product = products.value.find((p) => p.id === productId);
  return product?.name || '-';
}

function openDialog(row?: any) {
  isEdit.value = !!row;
  if (row) {
    Object.assign(form, {
      ...row,
      fixedAmountYuan: row.fixedAmount ? row.fixedAmount / 100 : 0,
    });
  } else {
    Object.assign(form, {
      productId: '',
      sellerId: '',
      ruleType: 'fixed_per_book',
      fixedAmountYuan: 0,
      rate: 0,
      threshold: 0,
      baseValue: 0,
      isDefault: false,
    });
  }
  dialogVisible.value = true;
}

async function submit() {
  try {
    const payload = {
      ...form,
      fixedAmount: Math.round(form.fixedAmountYuan * 100),
    };
    delete payload.fixedAmountYuan;
    if (isEdit.value) {
      await api.patch(`/rewards/rules/${form.id}`, payload);
    } else {
      await api.post('/rewards/rules', payload);
    }
    ElMessage.success('操作成功');
    dialogVisible.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  }
}

async function remove(row: any) {
  try {
    await ElMessageBox.confirm('确认删除该规则？', '提示', { type: 'warning' });
    await api.delete(`/rewards/rules/${row.id}`);
    ElMessage.success('删除成功');
    loadData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
    }
  }
}

onMounted(() => {
  loadData();
  loadSellers();
  loadProducts();
});
</script>
