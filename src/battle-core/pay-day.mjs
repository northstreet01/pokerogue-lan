export function validatePayDay(value) {
  if(!Array.isArray(value)||value.length!==2||!value.every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('INVALID_PAY_DAY_MONEY');
  return [...value];
}
export function scatterPayDay(battle,seat,amount) {
  if(seat!==0&&seat!==1)throw Error('INVALID_PAY_DAY_OWNER');
  const pending=validatePayDay(battle.payDayMoney??[0,0]);
  if(!Number.isSafeInteger(amount)||amount<0||!Number.isSafeInteger(pending[seat]+amount))throw Error('INVALID_PAY_DAY_MONEY');
  pending[seat]+=amount;battle.payDayMoney=pending;
}
export function takePayDay(battle) {
  const pending=validatePayDay(battle.payDayMoney??[0,0]);
  delete battle.payDayMoney;
  return pending;
}
