import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView, Modal,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { addTrip } from '../../redux/slices/earningsSlice';
import { clearTrip } from '../../redux/slices/tripSlice';
import useTranslation from '../../hooks/useTranslation';

const MP_PUBLIC_KEY   = 'TEST-5c382f2a-ebab-4b48-8c96-eebd94f43a1b';
const MP_ACCESS_TOKEN = 'TEST-1689754916728101-052801-9747728794f015708cdd4252b2412664-3433213644';

const TEST_CARDS = [
  { number: '4509 9535 6623 3704', brand: 'Visa',       type: 'approved' },
  { number: '5031 7557 3453 0604', brand: 'Mastercard', type: 'approved' },
  { number: '4000 0000 0000 0002', brand: 'Visa',       type: 'rejected' },
];

const PaymentScreen = ({ navigation, route }) => {
  const dispatch     = useDispatch();
  const user         = useSelector(state => state.user);
  const trip         = useSelector(state => state.trip);
  const { language } = useTranslation();

  const fare         = route?.params?.fare         || trip.estimatedFare || 0;
  const driverName   = route?.params?.driverName   || '';
  const distKm       = route?.params?.distKm       || 0;
  const origin       = route?.params?.origin       || trip.origin?.text  || '';
  const destination  = route?.params?.destination  || trip.destination?.text || '';
  const driverRating = route?.params?.selectedRating || 0;

  // 'select' | 'card' | 'cash'
  const [step,        setStep]        = useState('select');
  const [cardNumber,  setCardNumber]  = useState('');
  const [cardName,    setCardName]    = useState('');
  const [expiry,      setExpiry]      = useState('');
  const [cvv,         setCvv]         = useState('');
  const [docNumber,   setDocNumber]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTest,    setShowTest]    = useState(false);
  const [payMethod,   setPayMethod]   = useState('');

  const l = ({
    es: {
      title:          'Pagar viaje',
      chooseMethod:   '¿Cómo quieres pagar?',
      cash:           'Efectivo',
      cashDesc:       'Paga directamente al conductor',
      card:           'Pasarela de pagos',
      cardDesc:       'Tarjeta crédito o débito',
      cardNumber:     'Número de tarjeta',
      cardName:       'Nombre en la tarjeta',
      expiry:         'Vencimiento (MM/AA)',
      cvv:            'CVV',
      docNumber:      'Número de documento',
      pay:            'Pagar ahora',
      confirmCash:    'Confirmar pago en efectivo',
      cashMsg:        'Recuerda pagar al conductor al finalizar el viaje.',
      success:        '¡Pago exitoso!',
      successCard:    'Tu pago con tarjeta fue procesado correctamente.',
      successCash:    'Recuerda entregar el efectivo al conductor.',
      finish:         'Finalizar',
      testCards:      'Tarjetas de prueba',
      approved:       'Aprobada',
      rejected:       'Rechazada',
      use:            'Usar',
      errorFields:    'Completa todos los campos',
      errorCard:      'Número de tarjeta inválido',
      errorExpiry:    'Vencimiento inválido (MM/AA)',
      errorCvv:       'CVV inválido',
      paymentError:   'Error al procesar el pago',
      back:           '← Volver',
    },
    en: {
      title:          'Pay ride',
      chooseMethod:   'How do you want to pay?',
      cash:           'Cash',
      cashDesc:       'Pay directly to the driver',
      card:           'Payment gateway',
      cardDesc:       'Credit or debit card',
      cardNumber:     'Card number',
      cardName:       'Name on card',
      expiry:         'Expiry (MM/YY)',
      cvv:            'CVV',
      docNumber:      'Document number',
      pay:            'Pay now',
      confirmCash:    'Confirm cash payment',
      cashMsg:        'Remember to pay the driver at the end of the trip.',
      success:        'Payment successful!',
      successCard:    'Your card payment was processed correctly.',
      successCash:    'Remember to hand the cash to the driver.',
      finish:         'Finish',
      testCards:      'Test cards',
      approved:       'Approved',
      rejected:       'Rejected',
      use:            'Use',
      errorFields:    'Fill in all fields',
      errorCard:      'Invalid card number',
      errorExpiry:    'Invalid expiry (MM/YY)',
      errorCvv:       'Invalid CVV',
      paymentError:   'Payment processing error',
      back:           '← Back',
    },
  })[language] || {};

  const saveTrip = (method) => {
    dispatch(addTrip({
      id:          Date.now().toString(),
      origin,
      destination,
      fare,
      distKm,
      rating:      driverRating,
      date:        new Date().toISOString(),
      userType:    'passenger',
      driverName,
      paid:        true,
      paymentMethod: method,
    }));
    dispatch(clearTrip());
  };

  // ── Cash flow ──────────────────────────────────────────────
  const handleCash = () => {
    Alert.alert(l.confirmCash, l.cashMsg, [
      { text: language === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
      {
        text: language === 'es' ? 'Confirmar' : 'Confirm',
        onPress: () => {
          setPayMethod('cash');
          saveTrip('cash');
          setShowSuccess(true);
        },
      },
    ]);
  };

  // ── Card flow ──────────────────────────────────────────────
  const formatCardNumber = (text) => {
    const clean = text.replace(/\D/g, '').slice(0, 16);
    return clean.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (text) => {
    const clean = text.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 2) return clean.slice(0, 2) + '/' + clean.slice(2);
    return clean;
  };

  const getCardToken = async () => {
    const [expMonth, expYear] = expiry.split('/');
    const body = {
      card_number:      cardNumber.replace(/\s/g, ''),
      expiration_month: parseInt(expMonth),
      expiration_year:  parseInt('20' + expYear),
      security_code:    cvv,
      cardholder: {
        name:           cardName,
        identification: { type: 'CC', number: docNumber },
      },
    };
    const res  = await fetch(
      `https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );
    const data = await res.json();
    if (!data.id) throw new Error(data.message || 'Token error');
    return data.id;
  };

  const getPaymentMethodId = (number) => {
    const clean = number.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'master';
    if (clean.startsWith('34') || clean.startsWith('37')) return 'amex';
    return 'visa';
  };

  const processPayment = async (token) => {
    const body = {
      token,
      transaction_amount: Math.max(fare, 1000),
      description:        `UberClone — ${origin} to ${destination}`,
      installments:       1,
      payment_method_id:  getPaymentMethodId(cardNumber),
      payer: { email: user.email, identification: { type: 'CC', number: docNumber } },
    };
    const res  = await fetch('https://api.mercadopago.com/v1/payments', {
      method:  'POST',
      headers: {
        'Content-Type':       'application/json',
        'Authorization':      `Bearer ${MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key':  `${user.uid}-${Date.now()}`,
      },
      body:    JSON.stringify(body),
    });
    return res.json();
  };

  const validate = () => {
    if (!cardNumber || !cardName || !expiry || !cvv || !docNumber) {
      Alert.alert('Error', l.errorFields); return false;
    }
    if (cardNumber.replace(/\s/g, '').length < 13) {
      Alert.alert('Error', l.errorCard); return false;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      Alert.alert('Error', l.errorExpiry); return false;
    }
    if (cvv.length < 3) {
      Alert.alert('Error', l.errorCvv); return false;
    }
    return true;
  };

  const handlePay = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const token  = await getCardToken();
      const result = await processPayment(token);
      if (result.status === 'approved') {
        setPayMethod('card');
        saveTrip('card');
        setShowSuccess(true);
      } else {
        // Show full error detail for debugging
        const detail = result.status_detail || result.message || result.error || JSON.stringify(result);
        Alert.alert('Error', `${l.paymentError}:\n${detail}`);
      }
    } catch (e) {
      Alert.alert('Error', e.message || l.paymentError);
    } finally {
      setLoading(false);
    }
  };

  const useTestCard = (card) => {
    setCardNumber(card.number);
    setCardName(card.type === 'approved' ? 'APRO' : 'FUND INSUF');
    setExpiry('12/26');
    setCvv('123');
    setDocNumber('12345678');
    setShowTest(false);
  };

  // ── Fare summary (shared) ──────────────────────────────────
  const FareSummary = () => (
    <View style={styles.fareCard}>
      <Text style={styles.fareLabel}>{l.title}</Text>
      <Text style={styles.fareAmount}>${fare.toLocaleString()} COP</Text>
      {origin      ? <Text style={styles.fareRoute} numberOfLines={1}>📍 {origin}</Text>      : null}
      {destination ? <Text style={styles.fareRoute} numberOfLines={1}>🏁 {destination}</Text> : null}
    </View>
  );

  // ── STEP: select method ────────────────────────────────────
  if (step === 'select') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{l.chooseMethod}</Text>
          <FareSummary />

          <TouchableOpacity style={styles.methodCard} onPress={handleCash}>
            <Text style={styles.methodEmoji}>💵</Text>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>{l.cash}</Text>
              <Text style={styles.methodDesc}>{l.cashDesc}</Text>
            </View>
            <Text style={styles.methodArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.methodCard} onPress={() => setStep('card')}>
            <Text style={styles.methodEmoji}>💳</Text>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>{l.card}</Text>
              <Text style={styles.methodDesc}>{l.cardDesc}</Text>
            </View>
            <Text style={styles.methodArrow}>›</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Success modal (cash) */}
        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.successCard}>
              <Text style={styles.successEmoji}>{payMethod === 'cash' ? '💵' : '✅'}</Text>
              <Text style={styles.successTitle}>{l.success}</Text>
              <Text style={styles.successMsg}>{payMethod === 'cash' ? l.successCash : l.successCard}</Text>
              <Text style={styles.successAmount}>${fare.toLocaleString()} COP</Text>
              <TouchableOpacity
                style={styles.finishBtn}
                onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
              >
                <Text style={styles.finishBtnText}>{l.finish}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ── STEP: card form ────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => setStep('select')} style={styles.backBtn}>
        <Text style={styles.backBtnText}>{l.back}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{l.card}</Text>
      <FareSummary />

      <TouchableOpacity style={styles.testBtn} onPress={() => setShowTest(true)}>
        <Text style={styles.testBtnText}>🧪 {l.testCards}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>{l.cardNumber}</Text>
      <TextInput style={styles.input} value={cardNumber}
        onChangeText={t => setCardNumber(formatCardNumber(t))}
        keyboardType="numeric" maxLength={19}
        placeholder="0000 0000 0000 0000" placeholderTextColor="#aaa" />

      <Text style={styles.label}>{l.cardName}</Text>
      <TextInput style={styles.input} value={cardName}
        onChangeText={setCardName} autoCapitalize="characters"
        placeholder="NOMBRE TITULAR" placeholderTextColor="#aaa" />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>{l.expiry}</Text>
          <TextInput style={styles.input} value={expiry}
            onChangeText={t => setExpiry(formatExpiry(t))}
            keyboardType="numeric" maxLength={5}
            placeholder="MM/AA" placeholderTextColor="#aaa" />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>{l.cvv}</Text>
          <TextInput style={styles.input} value={cvv}
            onChangeText={setCvv} keyboardType="numeric"
            maxLength={4} secureTextEntry
            placeholder="123" placeholderTextColor="#aaa" />
        </View>
      </View>

      <Text style={styles.label}>{l.docNumber}</Text>
      <TextInput style={styles.input} value={docNumber}
        onChangeText={setDocNumber} keyboardType="numeric"
        placeholder="1234567890" placeholderTextColor="#aaa" />

      <TouchableOpacity
        style={[styles.payBtn, loading && styles.payBtnDisabled]}
        onPress={handlePay} disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.payBtnText}>{l.pay} — ${fare.toLocaleString()}</Text>
        }
      </TouchableOpacity>

      {/* Test cards modal */}
      <Modal visible={showTest} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{l.testCards}</Text>
            {TEST_CARDS.map((card, i) => (
              <View key={i} style={styles.testCardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testCardNumber}>{card.number}</Text>
                  <Text style={styles.testCardBrand}>
                    {card.brand} · {card.type === 'approved' ? l.approved : l.rejected}
                  </Text>
                </View>
                <TouchableOpacity style={styles.useBtn} onPress={() => useTestCard(card)}>
                  <Text style={styles.useBtnText}>{l.use}</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={() => setShowTest(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success modal (card) */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>✅</Text>
            <Text style={styles.successTitle}>{l.success}</Text>
            <Text style={styles.successMsg}>{l.successCard}</Text>
            <Text style={styles.successAmount}>${fare.toLocaleString()} COP</Text>
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
            >
              <Text style={styles.finishBtnText}>{l.finish}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f7f7f7' },
  content:    { padding: 20, paddingBottom: 40 },
  title:      { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 20, textAlign: 'center' },
  backBtn:    { marginBottom: 12 },
  backBtnText:{ fontSize: 14, color: '#555', fontWeight: '600' },

  fareCard:   { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
  fareLabel:  { fontSize: 12, color: '#aaa', marginBottom: 4 },
  fareAmount: { fontSize: 34, fontWeight: '900', color: '#4ade80', marginBottom: 8 },
  fareRoute:  { fontSize: 12, color: '#888', marginTop: 2 },

  methodCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  methodEmoji: { fontSize: 36, marginRight: 14 },
  methodInfo:  { flex: 1 },
  methodTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  methodDesc:  { fontSize: 13, color: '#888', marginTop: 3 },
  methodArrow: { fontSize: 24, color: '#ccc', fontWeight: '300' },

  testBtn:     { alignSelf: 'center', backgroundColor: '#f0f4ff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20 },
  testBtnText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 13, fontSize: 15, color: '#222', marginBottom: 14 },
  row:   { flexDirection: 'row', gap: 12 },
  half:  { flex: 1 },

  payBtn:         { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 17, alignItems: 'center', marginTop: 8 },
  payBtnDisabled: { backgroundColor: '#888' },
  payBtnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },

  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:  { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },

  testCardRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  testCardNumber: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  testCardBrand:  { fontSize: 12, color: '#888', marginTop: 3 },
  useBtn:         { backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  useBtnText:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  closeBtn:       { alignSelf: 'center', marginTop: 16, padding: 8 },
  closeBtnText:   { fontSize: 18, color: '#888' },

  successCard:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 36, alignItems: 'center' },
  successEmoji:  { fontSize: 64, marginBottom: 16 },
  successTitle:  { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  successMsg:    { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 16 },
  successAmount: { fontSize: 30, fontWeight: '900', color: '#2e7d32', marginBottom: 24 },
  finishBtn:     { backgroundColor: '#1a1a1a', borderRadius: 12, paddingHorizontal: 40, paddingVertical: 14 },
  finishBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default PaymentScreen;