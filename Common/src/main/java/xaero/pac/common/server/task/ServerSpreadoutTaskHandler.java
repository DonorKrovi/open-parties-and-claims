/*
 * Open Parties and Claims - adds chunk claims and player parties to Minecraft
 * Copyright (C) 2022, Xaero <xaero1996@gmail.com> and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of version 3 of the GNU Lesser General Public License
 * (LGPL-3.0-only) as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received copies of the GNU Lesser General Public License
 * and the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

package xaero.pac.common.server.task;

import xaero.pac.common.server.IServerData;

import java.util.Iterator;
import java.util.function.Function;

public abstract class ServerSpreadoutTaskHandler<T extends IServerSpreadoutTask<H>, H> {

	protected final Function<H, T> holderToTask;
	protected final int perTickLimit;
	protected final int perTickPerTaskLimit;

	protected ServerSpreadoutTaskHandler(Function<H, T> holderToTask, int perTickLimit, int perTickPerTaskLimit) {
		this.holderToTask = holderToTask;
		this.perTickLimit = perTickLimit;
		this.perTickPerTaskLimit = perTickPerTaskLimit;
	}

	protected abstract Iterator<H> getTaskHolderIterator(IServerData<?,?> serverData);

	public void onTick(IServerData<?,?> serverData){
		int taskCount = 0;
		Iterator<H> taskHolderIterator = getTaskHolderIterator(serverData);
		while(taskHolderIterator.hasNext()){
			H taskHolder = taskHolderIterator.next();
			T task = holderToTask.apply(taskHolder);
			if(task.shouldWork(serverData, taskHolder))
				taskCount++;
		}
		if(taskCount == 0)
			return;
		int perTask = Math.min(perTickPerTaskLimit, perTickLimit / taskCount);
		if(perTask == 0)
			perTask = 1;
		int allowedCount = perTickLimit;//to respect the perTickLimit when perTask is changed from 0 to 1
		taskHolderIterator = getTaskHolderIterator(serverData);
		while(taskHolderIterator.hasNext() && allowedCount-- > 0){
			H taskHolder = taskHolderIterator.next();
			T task = holderToTask.apply(taskHolder);
			if(task.shouldWork(serverData, taskHolder))
				task.onTick(serverData, taskHolder, perTask);
			if(canDropTasks() && task.shouldDrop(serverData, taskHolder))
				taskHolderIterator.remove();
		}
	}

	protected boolean canDropTasks(){
		return true;
	}

	public static abstract class Builder<T extends IServerSpreadoutTask<H>, H, B extends Builder<T, H, B>> {

		protected final B self;
		protected Function<H, T> holderToTask;
		protected int perTickLimit;
		protected int perTickPerTaskLimit;

		protected Builder(){
			@SuppressWarnings("unchecked")
			B self = (B) this;
			this.self = self;
		}

		public B setDefault(){
			setHolderToTask(null);
			setPerTickLimit(-1);
			setPerTickPerTaskLimit(-1);
			return self;
		}

		public B setHolderToTask(Function<H, T> holderToTask) {
			this.holderToTask = holderToTask;
			return self;
		}

		public B setPerTickLimit(int perTickLimit) {
			this.perTickLimit = perTickLimit;
			return self;
		}

		public B setPerTickPerTaskLimit(int perTickPerTaskLimit) {
			this.perTickPerTaskLimit = perTickPerTaskLimit;
			return self;
		}

		public ServerSpreadoutTaskHandler<T, H> build(){
			if(perTickLimit == -1 || perTickPerTaskLimit == -1 || holderToTask == null)
				throw new IllegalStateException();
			return buildInternally();
		}

		protected abstract ServerSpreadoutTaskHandler<T, H> buildInternally();

	}

}
